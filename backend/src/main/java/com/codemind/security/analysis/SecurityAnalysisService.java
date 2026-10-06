package com.codemind.security.analysis;

import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.common.exception.ValidationException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import com.codemind.ingestion.PathTraversalGuard;
import com.codemind.ingestion.SandboxProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

/**
 * Service orchestrating deterministic security analysis, findings retrieval, and access control.
 */
@Service
public class SecurityAnalysisService {

    private static final Logger log = LoggerFactory.getLogger(SecurityAnalysisService.class);

    private final RepositoryEntityRepository repositoryEntityRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final RepositoryFileRepository repositoryFileRepository;
    private final SymbolRepository symbolRepository;
    private final SecurityAnalysisRepository securityAnalysisRepository;
    private final SecurityFindingRepository securityFindingRepository;
    private final SecurityRuleEngine securityRuleEngine;
    private final PathTraversalGuard pathTraversalGuard;
    private final SandboxProperties sandboxProperties;
    private final AuditService auditService;

    public SecurityAnalysisService(
            RepositoryEntityRepository repositoryEntityRepository,
            AnalysisRunRepository analysisRunRepository,
            RepositoryFileRepository repositoryFileRepository,
            SymbolRepository symbolRepository,
            SecurityAnalysisRepository securityAnalysisRepository,
            SecurityFindingRepository securityFindingRepository,
            SecurityRuleEngine securityRuleEngine,
            PathTraversalGuard pathTraversalGuard,
            SandboxProperties sandboxProperties,
            AuditService auditService
    ) {
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.repositoryFileRepository = repositoryFileRepository;
        this.symbolRepository = symbolRepository;
        this.securityAnalysisRepository = securityAnalysisRepository;
        this.securityFindingRepository = securityFindingRepository;
        this.securityRuleEngine = securityRuleEngine;
        this.pathTraversalGuard = pathTraversalGuard;
        this.sandboxProperties = sandboxProperties;
        this.auditService = auditService;
    }

    @Transactional
    public SecurityAnalysisEntity analyzeSecurity(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        AnalysisRunEntity run;
        if (analysisId != null) {
            run = analysisRunRepository.findByIdAndRepositoryId(analysisId, repositoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("AnalysisRun", analysisId));
        } else {
            run = analysisRunRepository.findFirstByRepositoryIdOrderByStartedAtDesc(repositoryId)
                    .orElseThrow(() -> new ValidationException("No analysis runs found for repository. Perform static analysis first."));
        }

        auditService.logEvent(
                requester.getEmail(),
                "SECURITY_ANALYSIS_STARTED",
                "INFO",
                null,
                MDC.get("correlationId"),
                "Initiating deterministic security scan for repo " + repositoryId + ", run " + run.getId()
        );

        List<RepositoryFileEntity> files = repositoryFileRepository.findByRepositoryIdOrderByRelativePathAsc(repositoryId);
        List<SymbolEntity> symbols = symbolRepository.findByAnalysisId(run.getId());
        String storageDir = repo.getStorageDirName() != null ? repo.getStorageDirName() : repositoryId.toString();
        Path sourceRoot = sandboxProperties.getRootPath().resolve("repositories").resolve(storageDir).resolve("source");

        List<SecurityFindingEntity> allFindings = new ArrayList<>();

        for (RepositoryFileEntity file : files) {
            if (file.isBinary()) {
                continue;
            }
            try {
                Path target = pathTraversalGuard.validateAndResolve(
                        file.getRelativePath(),
                        sourceRoot,
                        sandboxProperties.getMaxPathLength(),
                        sandboxProperties.getMaxFilenameLength()
                );
                if (Files.isRegularFile(target)) {
                    String content = Files.readString(target);
                    SecurityRuleEngine.SecurityScanResult fileResult = securityRuleEngine.scanFile(
                            file.getRelativePath(), content, repositoryId, run.getId(), symbols
                    );
                    allFindings.addAll(fileResult.findings());
                }
            } catch (Exception e) {
                log.warn("Failed reading or scanning file {} for security analysis: {}", file.getRelativePath(), e.getMessage());
            }
        }

        SecurityRuleEngine.SecurityScanResult agg = securityRuleEngine.aggregateResults(allFindings);

        SecurityAnalysisEntity analysisEntity = new SecurityAnalysisEntity(
                UUID.randomUUID(),
                repositoryId,
                run.getId(),
                agg.totalCount(),
                agg.criticalCount(),
                agg.highCount(),
                agg.mediumCount(),
                agg.lowCount(),
                agg.infoCount(),
                agg.riskScore(),
                "COMPLETED"
        );
        analysisEntity = securityAnalysisRepository.save(analysisEntity);

        // Associate security_analysis_id with each finding
        for (SecurityFindingEntity f : allFindings) {
            f.setSecurityAnalysisId(analysisEntity.getId());
        }
        securityFindingRepository.saveAll(allFindings);

        auditService.logEvent(
                requester.getEmail(),
                "SECURITY_ANALYSIS_COMPLETED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("Deterministic security scan complete: %d findings (Risk: %.1f)",
                        agg.totalCount(), agg.riskScore())
        );

        return analysisEntity;
    }

    @Transactional(readOnly = true)
    public Page<SecurityAnalysisEntity> getSecurityAnalyses(UUID repositoryId, UserEntity requester, Pageable pageable) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return securityAnalysisRepository.findByRepositoryIdOrderByCreatedAtDesc(repositoryId, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<SecurityAnalysisEntity> getLatestSecurityAnalysis(UUID repositoryId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return securityAnalysisRepository.findFirstByRepositoryIdOrderByCreatedAtDesc(repositoryId);
    }

    @Transactional(readOnly = true)
    public SecurityAnalysisEntity getSecurityAnalysis(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return securityAnalysisRepository.findById(analysisId)
                .filter(a -> a.getRepositoryId().equals(repositoryId))
                .orElseThrow(() -> new ResourceNotFoundException("SecurityAnalysis", analysisId));
    }

    @Transactional(readOnly = true)
    public Page<SecurityFindingEntity> getFindings(
            UUID repositoryId,
            UUID analysisId,
            Severity severity,
            SecurityCategory category,
            UserEntity requester,
            Pageable pageable
    ) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        boolean isSecurityAnalysis = securityAnalysisRepository.existsById(analysisId);

        if (isSecurityAnalysis) {
            if (severity != null) {
                return securityFindingRepository.findByRepositoryIdAndSecurityAnalysisIdAndSeverity(repositoryId, analysisId, severity, pageable);
            } else if (category != null) {
                return securityFindingRepository.findByRepositoryIdAndSecurityAnalysisIdAndCategory(repositoryId, analysisId, category, pageable);
            } else {
                return securityFindingRepository.findByRepositoryIdAndSecurityAnalysisId(repositoryId, analysisId, pageable);
            }
        } else {
            if (severity != null) {
                return securityFindingRepository.findByRepositoryIdAndAnalysisIdAndSeverity(repositoryId, analysisId, severity, pageable);
            } else if (category != null) {
                return securityFindingRepository.findByRepositoryIdAndAnalysisIdAndCategory(repositoryId, analysisId, category, pageable);
            } else {
                return securityFindingRepository.findByRepositoryIdAndAnalysisId(repositoryId, analysisId, pageable);
            }
        }
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
                    "User attempted to access unauthorized security analysis: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to access this repository");
        }
    }
}
