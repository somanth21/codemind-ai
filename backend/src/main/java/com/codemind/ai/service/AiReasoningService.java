package com.codemind.ai.service;

import com.codemind.ai.LlmClient;
import com.codemind.ai.LlmRequest;
import com.codemind.ai.LlmResponse;
import com.codemind.ai.config.LlmRateLimiter;
import com.codemind.ai.evidence.ContextBudgetManager;
import com.codemind.ai.evidence.EvidenceChunk;
import com.codemind.ai.evidence.EvidenceSelectionService;
import com.codemind.ai.exception.GroundingValidationException;
import com.codemind.ai.model.GroundedReasoningResponse;
import com.codemind.ai.model.GroundingValidator;
import com.codemind.ai.model.ReasoningStep;
import com.codemind.ai.model.StructuredResponseParser;
import com.codemind.ai.prompt.GroundedPromptBuilder;
import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.common.exception.ValidationException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import com.codemind.web.dto.AiReasoningDto;
import com.codemind.web.dto.ExplainEvidenceRequest;
import com.codemind.web.dto.ExplainReuseRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Orchestrates grounded AI reasoning over deterministic repository evidence.
 * LLM is downstream only: evidence selection -> budget enforcement -> delimited prompt -> LLM -> validation -> persistence.
 */
@Service
public class AiReasoningService {

    private static final Logger log = LoggerFactory.getLogger(AiReasoningService.class);

    private final LlmClient llmClient;
    private final LlmRateLimiter rateLimiter;
    private final EvidenceSelectionService evidenceSelectionService;
    private final ContextBudgetManager budgetManager;
    private final GroundedPromptBuilder promptBuilder;
    private final StructuredResponseParser responseParser;
    private final GroundingValidator groundingValidator;

    private final AiReasoningRequestRepository aiReasoningRequestRepository;
    private final ReuseAnalysisRepository reuseAnalysisRepository;
    private final ReuseCandidateRepository reuseCandidateRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final AuditService auditService;

    public AiReasoningService(
            LlmClient llmClient,
            LlmRateLimiter rateLimiter,
            EvidenceSelectionService evidenceSelectionService,
            ContextBudgetManager budgetManager,
            GroundedPromptBuilder promptBuilder,
            StructuredResponseParser responseParser,
            GroundingValidator groundingValidator,
            AiReasoningRequestRepository aiReasoningRequestRepository,
            ReuseAnalysisRepository reuseAnalysisRepository,
            ReuseCandidateRepository reuseCandidateRepository,
            AnalysisRunRepository analysisRunRepository,
            RepositoryEntityRepository repositoryEntityRepository,
            AuditService auditService
    ) {
        this.llmClient = llmClient;
        this.rateLimiter = rateLimiter;
        this.evidenceSelectionService = evidenceSelectionService;
        this.budgetManager = budgetManager;
        this.promptBuilder = promptBuilder;
        this.responseParser = responseParser;
        this.groundingValidator = groundingValidator;
        this.aiReasoningRequestRepository = aiReasoningRequestRepository;
        this.reuseAnalysisRepository = reuseAnalysisRepository;
        this.reuseCandidateRepository = reuseCandidateRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.auditService = auditService;
    }

    @Transactional
    public AiReasoningDto explainReuse(UUID repositoryId, ExplainReuseRequest request, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        // 1. Sliding-window rate limit check
        rateLimiter.checkLimit(requester.getId(), repositoryId);

        auditService.logEvent(
                requester.getEmail(),
                "AI_REQUEST_STARTED",
                "INFO",
                null,
                MDC.get("correlationId"),
                "Initiated AI reuse reasoning for repository: " + repositoryId
        );

        // 2. Fetch authoritative deterministic analysis
        ReuseAnalysisEntity analysis;
        if (request != null && request.reuseAnalysisId() != null) {
            analysis = reuseAnalysisRepository.findByIdAndRepositoryId(request.reuseAnalysisId(), repositoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("ReuseAnalysis", request.reuseAnalysisId()));
        } else {
            List<ReuseAnalysisEntity> list = reuseAnalysisRepository.findByRepositoryIdOrderByCreatedAtDesc(repositoryId);
            if (list.isEmpty()) {
                throw new ValidationException("No reuse analyses found for repository " + repositoryId + ". Run reuse analysis first.");
            }
            analysis = list.get(0);
        }

        // 3. Fetch candidate(s)
        List<ReuseCandidateEntity> candidates;
        if (request != null && request.candidateId() != null) {
            ReuseCandidateEntity candidate = reuseCandidateRepository.findById(request.candidateId())
                    .orElseThrow(() -> new ResourceNotFoundException("ReuseCandidate", request.candidateId()));
            candidates = List.of(candidate);
        } else {
            candidates = reuseCandidateRepository.findByReuseAnalysisIdOrderByOverallScoreDesc(analysis.getId());
        }

        // 4. Evidence extraction & context budgeting
        List<EvidenceChunk> rawChunks = evidenceSelectionService.selectEvidenceForReuse(repositoryId, analysis, candidates);
        ContextBudgetManager.BudgetResult budgetResult = budgetManager.applyBudget(rawChunks);

        boolean isSecurityBlocked = analysis.getSecurityStatus() == SecurityGateStatus.BLOCKED
                || candidates.stream().anyMatch(c -> c.getSecurityGate() == SecurityGateStatus.BLOCKED);

        // 5. Delimited prompt generation
        String userQuery = (request != null && request.developerQuestion() != null && !request.developerQuestion().isBlank())
                ? request.developerQuestion()
                : analysis.getQuery();

        String prompt = promptBuilder.buildReusePrompt(
                userQuery,
                analysis.getDecision().name(),
                analysis.getOverallScore(),
                analysis.getSecurityStatus().name(),
                budgetResult.selectedChunks()
        );

        LlmRequest llmRequest = LlmRequest.structured(
                prompt,
                promptBuilder.getSystemInstruction(),
                budgetResult.selectedChunks(),
                2048
        );

        // 6. Invoke LLM Provider
        LlmResponse llmResponse = llmClient.generateStructured(llmRequest, null);

        // 7. Parse structured output (retry once if unparseable)
        GroundedReasoningResponse reasoningResponse;
        try {
            reasoningResponse = responseParser.parse(llmResponse.content());
        } catch (GroundingValidationException e) {
            log.warn("Malformed structured JSON on first attempt; executing single repair retry...");
            LlmRequest retryRequest = LlmRequest.structured(
                    prompt + "\n\nCRITICAL: Previous response was not valid JSON. You MUST return strictly valid JSON matching the exact schema.",
                    promptBuilder.getSystemInstruction(),
                    budgetResult.selectedChunks(),
                    2048
            );
            llmResponse = llmClient.generateStructured(retryRequest, null);
            reasoningResponse = responseParser.parse(llmResponse.content());
        }

        // 8. Grounding validation & security gate check
        GroundingValidator.ValidationResult valResult = groundingValidator.validate(
                reasoningResponse,
                budgetResult.selectedChunks(),
                isSecurityBlocked
        );

        String effectiveRecommendation = reasoningResponse.recommendation();
        if (valResult.securityGateViolated()) {
            effectiveRecommendation = "[SECURITY POLICY BLOCKED] " + effectiveRecommendation
                    + " -- Note: Static analysis detected security violations (BLOCKED gate). Direct reuse is strictly forbidden.";
        }

        // 9. Persist audit entity
        AiReasoningRequestEntity entity = new AiReasoningRequestEntity(
                UUID.randomUUID(),
                repositoryId,
                analysis.getId(),
                requester.getId(),
                AiRequestType.EXPLAIN_REUSE,
                llmResponse.provider(),
                llmResponse.model(),
                budgetResult.selectedChunks().size(),
                budgetResult.totalChars(),
                budgetResult.truncated(),
                llmResponse.promptTokens(),
                llmResponse.completionTokens(),
                llmResponse.latencyMs(),
                analysis.getDecision().name(),
                reasoningResponse.summary(),
                llmResponse.content()
        );
        entity = aiReasoningRequestRepository.save(entity);

        auditService.logEvent(
                requester.getEmail(),
                "AI_REQUEST_COMPLETED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("AI reuse reasoning completed. Provider: %s, Latency: %d ms, Tokens: %s",
                        llmResponse.provider(), llmResponse.latencyMs(), llmResponse.totalTokens())
        );

        return toDto(entity, reasoningResponse, effectiveRecommendation, budgetResult, valResult);
    }

    @Transactional
    public AiReasoningDto explainEvidence(UUID repositoryId, ExplainEvidenceRequest request, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        rateLimiter.checkLimit(requester.getId(), repositoryId);

        auditService.logEvent(
                requester.getEmail(),
                "AI_REQUEST_STARTED",
                "INFO",
                null,
                MDC.get("correlationId"),
                "Initiated AI evidence reasoning for query: " + request.query()
        );

        UUID analysisId = request.analysisId();
        if (analysisId == null) {
            AnalysisRunEntity latestRun = analysisRunRepository.findFirstByRepositoryIdOrderByStartedAtDesc(repositoryId)
                    .orElseThrow(() -> new ValidationException("No analysis runs found for repository. Analyze repository first."));
            analysisId = latestRun.getId();
        }

        int limit = request.limit() != null && request.limit() > 0 ? request.limit() : 5;
        List<EvidenceChunk> rawChunks = evidenceSelectionService.selectEvidenceForQuery(repositoryId, analysisId, request.query(), limit);
        ContextBudgetManager.BudgetResult budgetResult = budgetManager.applyBudget(rawChunks);

        String prompt = promptBuilder.buildEvidencePrompt(request.query(), budgetResult.selectedChunks());
        LlmRequest llmRequest = LlmRequest.structured(
                prompt,
                promptBuilder.getSystemInstruction(),
                budgetResult.selectedChunks(),
                2048
        );

        LlmResponse llmResponse = llmClient.generateStructured(llmRequest, null);
        GroundedReasoningResponse reasoningResponse = responseParser.parse(llmResponse.content());

        GroundingValidator.ValidationResult valResult = groundingValidator.validate(
                reasoningResponse,
                budgetResult.selectedChunks(),
                false
        );

        AiReasoningRequestEntity entity = new AiReasoningRequestEntity(
                UUID.randomUUID(),
                repositoryId,
                null,
                requester.getId(),
                AiRequestType.EXPLAIN_EVIDENCE,
                llmResponse.provider(),
                llmResponse.model(),
                budgetResult.selectedChunks().size(),
                budgetResult.totalChars(),
                budgetResult.truncated(),
                llmResponse.promptTokens(),
                llmResponse.completionTokens(),
                llmResponse.latencyMs(),
                "EVIDENCE_EXPLANATION",
                reasoningResponse.summary(),
                llmResponse.content()
        );
        entity = aiReasoningRequestRepository.save(entity);

        auditService.logEvent(
                requester.getEmail(),
                "AI_REQUEST_COMPLETED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("AI evidence reasoning completed. Provider: %s, Latency: %d ms",
                        llmResponse.provider(), llmResponse.latencyMs())
        );

        return toDto(entity, reasoningResponse, reasoningResponse.recommendation(), budgetResult, valResult);
    }

    @Transactional(readOnly = true)
    public Page<AiReasoningDto> getHistory(UUID repositoryId, UserEntity requester, Pageable pageable) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return aiReasoningRequestRepository.findByRepositoryIdOrderByCreatedAtDesc(repositoryId, pageable)
                .map(this::toHistoricalDto);
    }

    @Transactional(readOnly = true)
    public AiReasoningDto getRequestById(UUID repositoryId, UUID requestId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        AiReasoningRequestEntity entity = aiReasoningRequestRepository.findByIdAndRepositoryId(requestId, repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("AiReasoningRequest", requestId));

        return toHistoricalDto(entity);
    }

    private void validateReadAccess(RepositoryEntity repo, UserEntity requester) {
        if (requester.getRole() == Role.ROLE_ADMIN || requester.getRole() == Role.ROLE_AUDITOR) {
            return;
        }
        if (!repo.getOwner().getId().equals(requester.getId())) {
            auditService.logEvent(
                    requester.getEmail(),
                    "UNAUTHORIZED_ACCESS",
                    "WARNING",
                    null,
                    MDC.get("correlationId"),
                    "User attempted to invoke AI reasoning on unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to access this repository");
        }
    }

    private AiReasoningDto toDto(
            AiReasoningRequestEntity entity,
            GroundedReasoningResponse reasoning,
            String effectiveRecommendation,
            ContextBudgetManager.BudgetResult budget,
            GroundingValidator.ValidationResult valResult
    ) {
        List<AiReasoningDto.ClaimDto> claims = reasoning.reasoning().stream()
                .map(step -> new AiReasoningDto.ClaimDto(step.claim(), step.evidenceIds()))
                .collect(Collectors.toList());

        List<AiReasoningDto.EvidenceDto> evidenceDtos = budget.selectedChunks().stream()
                .map(c -> new AiReasoningDto.EvidenceDto(
                        c.evidenceId(),
                        c.filePath(),
                        c.symbolName(),
                        c.startLine(),
                        c.endLine(),
                        c.evidenceType(),
                        c.deterministicScore(),
                        c.sanitizedSnippet()
                ))
                .collect(Collectors.toList());

        int totalTokens = (entity.getPromptTokens() != null ? entity.getPromptTokens() : 0)
                + (entity.getCompletionTokens() != null ? entity.getCompletionTokens() : 0);

        return new AiReasoningDto(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getReuseAnalysisId(),
                entity.getRequestType().name(),
                entity.getProvider(),
                entity.getModel(),
                reasoning.summary(),
                effectiveRecommendation,
                claims,
                reasoning.limitations(),
                reasoning.confidence(),
                evidenceDtos,
                entity.getContextChars(),
                entity.isContextTruncated(),
                entity.getPromptTokens(),
                entity.getCompletionTokens(),
                totalTokens,
                entity.getLatencyMs(),
                valResult.citationCoverage(),
                valResult.valid(),
                !valResult.securityGateViolated(),
                entity.getCreatedAt()
        );
    }

    private AiReasoningDto toHistoricalDto(AiReasoningRequestEntity entity) {
        GroundedReasoningResponse parsed;
        try {
            parsed = responseParser.parse(entity.getResponseJson());
        } catch (Exception e) {
            parsed = new GroundedReasoningResponse(entity.getSummary(), "", List.of(), List.of(), 0.0);
        }

        List<AiReasoningDto.ClaimDto> claims = parsed.reasoning().stream()
                .map(step -> new AiReasoningDto.ClaimDto(step.claim(), step.evidenceIds()))
                .collect(Collectors.toList());

        int totalTokens = (entity.getPromptTokens() != null ? entity.getPromptTokens() : 0)
                + (entity.getCompletionTokens() != null ? entity.getCompletionTokens() : 0);

        return new AiReasoningDto(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getReuseAnalysisId(),
                entity.getRequestType().name(),
                entity.getProvider(),
                entity.getModel(),
                entity.getSummary(),
                parsed.recommendation(),
                claims,
                parsed.limitations(),
                parsed.confidence(),
                Collections.emptyList(),
                entity.getContextChars(),
                entity.isContextTruncated(),
                entity.getPromptTokens(),
                entity.getCompletionTokens(),
                totalTokens,
                entity.getLatencyMs(),
                1.0,
                true,
                true,
                entity.getCreatedAt()
        );
    }
}
