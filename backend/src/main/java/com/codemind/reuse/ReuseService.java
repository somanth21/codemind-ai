package com.codemind.reuse;

import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ReuseService implements ReuseAnalysisEngine {

    private static final Logger log = LoggerFactory.getLogger(ReuseService.class);

    private final RepositoryEntityRepository repositoryEntityRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final ReuseAnalysisRepository reuseAnalysisRepository;
    private final ReuseCandidateRepository reuseCandidateRepository;
    private final ReuseEvidenceRepository reuseEvidenceRepository;

    private final ReuseCandidateService reuseCandidateService;
    private final ReuseScoringEngine reuseScoringEngine;
    private final ReuseSecurityGate reuseSecurityGate;
    private final ReusePolicyEngine reusePolicyEngine;
    private final ReuseExplanationGenerator reuseExplanationGenerator;
    private final ReuseScoringConfig reuseScoringConfig;
    private final AuditService auditService;

    public record CandidateWithEvidence(
            ReuseCandidateEntity candidate,
            List<ReuseEvidenceEntity> evidence,
            List<String> positiveSignals,
            List<String> negativeSignals
    ) {}

    public record ReuseAnalysisResult(
            ReuseAnalysisEntity analysis,
            List<CandidateWithEvidence> candidates
    ) {}

    public ReuseService(
            RepositoryEntityRepository repositoryEntityRepository,
            AnalysisRunRepository analysisRunRepository,
            ReuseAnalysisRepository reuseAnalysisRepository,
            ReuseCandidateRepository reuseCandidateRepository,
            ReuseEvidenceRepository reuseEvidenceRepository,
            ReuseCandidateService reuseCandidateService,
            ReuseScoringEngine reuseScoringEngine,
            ReuseSecurityGate reuseSecurityGate,
            ReusePolicyEngine reusePolicyEngine,
            ReuseExplanationGenerator reuseExplanationGenerator,
            ReuseScoringConfig reuseScoringConfig,
            AuditService auditService
    ) {
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.reuseAnalysisRepository = reuseAnalysisRepository;
        this.reuseCandidateRepository = reuseCandidateRepository;
        this.reuseEvidenceRepository = reuseEvidenceRepository;
        this.reuseCandidateService = reuseCandidateService;
        this.reuseScoringEngine = reuseScoringEngine;
        this.reuseSecurityGate = reuseSecurityGate;
        this.reusePolicyEngine = reusePolicyEngine;
        this.reuseExplanationGenerator = reuseExplanationGenerator;
        this.reuseScoringConfig = reuseScoringConfig;
        this.auditService = auditService;
    }

    @Override
    public String getEngineVersion() {
        return "v1.0-deterministic";
    }

    @Transactional
    public ReuseAnalysisResult analyzeReuse(UUID repositoryId, String query, UserEntity requester, int limit) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));

        validateReadAccess(repo, requester);

        AnalysisRunEntity latestRun = analysisRunRepository.findFirstByRepositoryIdOrderByStartedAtDesc(repositoryId)
                .orElseThrow(() -> new IllegalStateException("Repository has no completed static analysis runs. Run static analysis first."));

        if (latestRun.getStatus() != AnalysisStatus.COMPLETED) {
            throw new IllegalStateException("Latest static analysis run has not completed (status: " + latestRun.getStatus() + ").");
        }

        auditService.logEvent(
                requester.getEmail(),
                "REUSE_ANALYSIS_STARTED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("Reuse analysis started for repository %s with query: '%s'", repositoryId, query)
        );

        // 1. Discover candidates
        List<ReuseCandidateService.DiscoveredCandidate> discovered = reuseCandidateService.discoverCandidates(
                repositoryId,
                latestRun.getId(),
                query,
                limit > 0 ? limit : 10
        );

        // 2. Score, gate, and classify each candidate
        List<ReusePolicyEngine.EvaluatedCandidate> evaluated = new ArrayList<>();
        Map<ReuseCandidateService.DiscoveredCandidate, ReuseScoringEngine.CandidateScores> scoresMap = new HashMap<>();
        Map<ReuseCandidateService.DiscoveredCandidate, SecurityGateStatus> gateMap = new HashMap<>();

        for (ReuseCandidateService.DiscoveredCandidate dc : discovered) {
            ReuseScoringEngine.CandidateScores scores = reuseScoringEngine.scoreCandidate(dc, query);
            SecurityGateStatus gate = reuseSecurityGate.evaluate(dc, scores.securityScore());
            var candidateType = reusePolicyEngine.classifyCandidate(dc, scores, gate);

            scoresMap.put(dc, scores);
            gateMap.put(dc, gate);
            evaluated.add(new ReusePolicyEngine.EvaluatedCandidate(dc, scores, gate, candidateType));
        }

        // 3. Determine repository-level decision and confidence
        ReuseDecision decision = reusePolicyEngine.determineRepositoryDecision(evaluated, query);
        double confidence = reusePolicyEngine.calculateConfidence(decision, evaluated);

        // Determine repository security status
        SecurityGateStatus repoSecurityStatus = SecurityGateStatus.SAFE;
        if (!evaluated.isEmpty()) {
            ReusePolicyEngine.EvaluatedCandidate top = evaluated.stream()
                    .max(Comparator.comparingDouble(c -> c.scores().overallScore()))
                    .orElse(null);
            if (top != null) {
                repoSecurityStatus = top.securityGate();
            }
        }

        double overallScore = evaluated.stream()
                .mapToDouble(c -> c.scores().overallScore())
                .max()
                .orElse(0.0);

        String repoExplanation = reuseExplanationGenerator.generateRepositoryExplanation(decision, evaluated, query);

        // 4. Create and persist ReuseAnalysisEntity
        UUID reuseAnalysisId = UUID.randomUUID();
        ReuseAnalysisEntity analysisEntity = new ReuseAnalysisEntity(
                reuseAnalysisId,
                repositoryId,
                latestRun.getId(),
                query,
                decision,
                overallScore,
                confidence,
                repoSecurityStatus,
                repoExplanation,
                null,
                reuseScoringConfig.getConfigVersion(),
                reuseScoringConfig.toJson()
        );
        reuseAnalysisRepository.save(analysisEntity);

        // 5. Create candidates, explanations, and evidence
        List<CandidateWithEvidence> resultCandidates = new ArrayList<>();

        for (ReusePolicyEngine.EvaluatedCandidate ec : evaluated) {
            ReuseCandidateService.DiscoveredCandidate dc = ec.candidate();
            ReuseScoringEngine.CandidateScores sc = ec.scores();
            UUID candidateId = UUID.randomUUID();

            ReuseExplanationGenerator.CandidateExplanation expl = reuseExplanationGenerator.generateCandidateExplanation(
                    candidateId,
                    dc,
                    sc,
                    ec.securityGate(),
                    ec.candidateType()
            );

            ReuseCandidateEntity candidateEntity = new ReuseCandidateEntity(
                    candidateId,
                    reuseAnalysisId,
                    dc.symbol.getId(),
                    dc.symbol.getFilePath(),
                    dc.symbol.getName(),
                    dc.symbol.getKind().name(),
                    dc.symbol.getSignature(),
                    dc.symbol.getStartLine() != null ? dc.symbol.getStartLine() : 1,
                    dc.symbol.getEndLine() != null ? dc.symbol.getEndLine() : 1,
                    ec.candidateType(),
                    sc.overallScore(),
                    sc.functionalRelevance(),
                    sc.structuralSimilarity(),
                    sc.maintainabilityScore(),
                    sc.complexityPenalty(),
                    sc.securityScore(),
                    sc.modificationEffort(),
                    sc.dependencyImpact(),
                    sc.duplicationRisk(),
                    ec.securityGate(),
                    expl.summary()
            );
            reuseCandidateRepository.save(candidateEntity);

            if (!expl.evidenceList().isEmpty()) {
                reuseEvidenceRepository.saveAll(expl.evidenceList());
            }

            resultCandidates.add(new CandidateWithEvidence(
                    candidateEntity,
                    expl.evidenceList(),
                    expl.positiveSignals(),
                    expl.negativeSignals()
            ));
        }

        auditService.logEvent(
                requester.getEmail(),
                "REUSE_ANALYSIS_COMPLETED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("Reuse analysis %s completed with decision: %s (confidence: %.2f)",
                        reuseAnalysisId, decision, confidence)
        );

        return new ReuseAnalysisResult(analysisEntity, resultCandidates);
    }

    @Transactional(readOnly = true)
    public ReuseAnalysisEntity getReuseAnalysis(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return reuseAnalysisRepository.findByIdAndRepositoryId(analysisId, repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("ReuseAnalysis", analysisId));
    }

    @Transactional(readOnly = true)
    public Page<ReuseAnalysisEntity> getRepositoryReuseAnalyses(UUID repositoryId, UserEntity requester, Pageable pageable) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return reuseAnalysisRepository.findByRepositoryIdOrderByCreatedAtDesc(repositoryId, pageable);
    }

    @Transactional(readOnly = true)
    public List<ReuseCandidateEntity> getCandidates(UUID reuseAnalysisId) {
        return reuseCandidateRepository.findByReuseAnalysisIdOrderByOverallScoreDesc(reuseAnalysisId);
    }

    @Transactional(readOnly = true)
    public List<ReuseEvidenceEntity> getEvidence(UUID candidateId) {
        return reuseEvidenceRepository.findByCandidateId(candidateId);
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
                    "User attempted to perform reuse analysis on unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to access this repository");
        }
    }
}
