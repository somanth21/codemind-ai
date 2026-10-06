package com.codemind.analyzer;

import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.CodeMindException;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import com.codemind.ingestion.PathTraversalGuard;
import com.codemind.ingestion.RepositoryIngestionService;
import com.codemind.ingestion.SandboxProperties;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.CallableDeclaration;
import com.github.javaparser.ast.body.ConstructorDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.*;

@Service
public class AnalysisPipelineService {

    private static final Logger log = LoggerFactory.getLogger(AnalysisPipelineService.class);

    private final AnalysisRunRepository analysisRunRepository;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final RepositoryFileRepository repositoryFileRepository;
    private final SymbolRepository symbolRepository;
    private final RelationshipRepository relationshipRepository;
    private final FileMetricsRepository fileMetricsRepository;
    private final SymbolMetricsRepository symbolMetricsRepository;
    private final QualityFindingRepository qualityFindingRepository;
    private final SecretFindingRepository secretFindingRepository;

    private final RepositoryIngestionService repositoryIngestionService;
    private final AstParserService astParserService;
    private final JavaSymbolExtractor javaSymbolExtractor;
    private final JavaRelationshipExtractor javaRelationshipExtractor;
    private final MetricsCalculator metricsCalculator;
    private final QualityRuleEngine qualityRuleEngine;
    private final SecretScanner secretScanner;
    private final AuditService auditService;
    private final SandboxProperties sandboxProperties;
    private final PathTraversalGuard pathTraversalGuard;

    public AnalysisPipelineService(
            AnalysisRunRepository analysisRunRepository,
            RepositoryEntityRepository repositoryEntityRepository,
            RepositoryFileRepository repositoryFileRepository,
            SymbolRepository symbolRepository,
            RelationshipRepository relationshipRepository,
            FileMetricsRepository fileMetricsRepository,
            SymbolMetricsRepository symbolMetricsRepository,
            QualityFindingRepository qualityFindingRepository,
            SecretFindingRepository secretFindingRepository,
            RepositoryIngestionService repositoryIngestionService,
            AstParserService astParserService,
            JavaSymbolExtractor javaSymbolExtractor,
            JavaRelationshipExtractor javaRelationshipExtractor,
            MetricsCalculator metricsCalculator,
            QualityRuleEngine qualityRuleEngine,
            SecretScanner secretScanner,
            AuditService auditService,
            SandboxProperties sandboxProperties,
            PathTraversalGuard pathTraversalGuard
    ) {
        this.analysisRunRepository = analysisRunRepository;
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.repositoryFileRepository = repositoryFileRepository;
        this.symbolRepository = symbolRepository;
        this.relationshipRepository = relationshipRepository;
        this.fileMetricsRepository = fileMetricsRepository;
        this.symbolMetricsRepository = symbolMetricsRepository;
        this.qualityFindingRepository = qualityFindingRepository;
        this.secretFindingRepository = secretFindingRepository;
        this.repositoryIngestionService = repositoryIngestionService;
        this.astParserService = astParserService;
        this.javaSymbolExtractor = javaSymbolExtractor;
        this.javaRelationshipExtractor = javaRelationshipExtractor;
        this.metricsCalculator = metricsCalculator;
        this.qualityRuleEngine = qualityRuleEngine;
        this.secretScanner = secretScanner;
        this.auditService = auditService;
        this.sandboxProperties = sandboxProperties;
        this.pathTraversalGuard = pathTraversalGuard;
    }

    @Transactional
    public AnalysisRunEntity triggerAnalysis(UUID repositoryId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));

        validateOwnership(repo, requester);

        if (!RepositoryStatus.READY.name().equals(repo.getStatus())) {
            throw new CodeMindException("Analysis can only be run on repositories with READY status");
        }

        AnalysisRunEntity run = new AnalysisRunEntity(
                UUID.randomUUID(),
                repo,
                AnalysisStatus.ANALYZING,
                Instant.now()
        );
        run = analysisRunRepository.save(run);

        auditService.logEvent(
                requester.getEmail(),
                "ANALYSIS_STARTED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                "Started static analysis run " + run.getId() + " for repository " + repositoryId
        );

        try {
            executeAnalysis(run, repo);
            auditService.logEvent(
                    requester.getEmail(),
                    "ANALYSIS_COMPLETED",
                    "SUCCESS",
                    null,
                    MDC.get("correlationId"),
                    "Completed static analysis run " + run.getId() + " for repository " + repositoryId
            );
        } catch (Exception e) {
            log.error("Fatal failure during static analysis run {}: {}", run.getId(), e.getMessage(), e);
            run.setStatus(AnalysisStatus.FAILED);
            run.setFailureReason(e.getMessage());
            run.setCompletedAt(Instant.now());
            analysisRunRepository.save(run);

            auditService.logEvent(
                    requester.getEmail(),
                    "ANALYSIS_FAILED",
                    "FAILURE",
                    null,
                    MDC.get("correlationId"),
                    "Static analysis run " + run.getId() + " failed: " + e.getMessage()
            );
            throw new CodeMindException("Static analysis failed: " + e.getMessage(), e);
        }

        return run;
    }

    private void executeAnalysis(AnalysisRunEntity run, RepositoryEntity repo) {
        List<RepositoryFileEntity> files = repositoryFileRepository.findByRepositoryIdOrderByRelativePathAsc(repo.getId());
        Path sourceRoot = repositoryIngestionService.getSandboxSourcePath(repo.getId());

        int filesAnalyzed = 0;
        int filesSkipped = 0;
        int errorCount = 0;
        int warningCount = 0;
        long totalLoc = 0L;
        int totalClasses = 0;
        int totalMethods = 0;
        List<Double> methodComplexities = new ArrayList<>();
        List<Double> fileMaintainabilities = new ArrayList<>();

        for (RepositoryFileEntity file : files) {
            if (file.isBinary()) {
                filesSkipped++;
                continue;
            }

            Path filePath;
            try {
                filePath = pathTraversalGuard.validateAndResolve(
                        file.getRelativePath(),
                        sourceRoot,
                        sandboxProperties.getMaxPathLength(),
                        sandboxProperties.getMaxFilenameLength()
                );
            } catch (Exception e) {
                log.warn("Path validation error for file {}: {}", file.getRelativePath(), e.getMessage());
                filesSkipped++;
                continue;
            }

            if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
                filesSkipped++;
                continue;
            }

            String content;
            try {
                content = Files.readString(filePath, StandardCharsets.UTF_8);
            } catch (Exception e) {
                log.warn("Could not read file {}: {}", file.getRelativePath(), e.getMessage());
                errorCount++;
                continue;
            }

            // 1. Secret Scanning (run across all text files)
            List<SecretFindingEntity> secrets = secretScanner.scanContent(
                    content,
                    repo.getId(),
                    run.getId(),
                    file.getRelativePath()
            );
            if (!secrets.isEmpty()) {
                secretFindingRepository.saveAll(secrets);
                warningCount += secrets.size();
            }

            // 2. Language Analysis (Deep AST for Java, basic metrics for others)
            boolean isJava = "JAVA".equalsIgnoreCase(file.getLanguage()) || file.getRelativePath().endsWith(".java");
            int fileLoc = metricsCalculator.calculatePhysicalLoc(content);
            int fileLloc = metricsCalculator.calculateLogicalLoc(content);
            totalLoc += fileLoc;

            if (isJava) {
                AstParserService.AstParseResult parseResult = astParserService.parseSafely(content, file.getRelativePath());

                if (!parseResult.successful()) {
                    errorCount++;
                    qualityFindingRepository.save(new QualityFindingEntity(
                            UUID.randomUUID(),
                            repo.getId(),
                            run.getId(),
                            file.getRelativePath(),
                            null,
                            "SYNTAX_ERROR",
                            Severity.HIGH,
                            "Java AST Parsing Error",
                            parseResult.problemMessages().isEmpty() ? "File contains invalid syntax" : parseResult.problemMessages().get(0),
                            1,
                            "Parse issue in " + file.getRelativePath()
                    ));
                }

                if (parseResult.compilationUnit().isEmpty()) {
                    // Malformed Java syntax: Failure isolation!
                    fileMetricsRepository.save(new FileMetricsEntity(
                            UUID.randomUUID(),
                            repo.getId(),
                            run.getId(),
                            file.getRelativePath(),
                            fileLoc,
                            fileLloc,
                            0,
                            0,
                            0,
                            0.0,
                            0.0
                    ));
                    filesAnalyzed++;
                    continue;
                }

                CompilationUnit cu = parseResult.compilationUnit().get();

                // Extract Symbols
                List<SymbolEntity> symbols = javaSymbolExtractor.extractSymbols(
                        cu,
                        repo.getId(),
                        run.getId(),
                        file.getRelativePath()
                );
                symbols = symbolRepository.saveAll(symbols);

                // Extract Relationships
                List<RelationshipEntity> relationships = javaRelationshipExtractor.extractRelationships(
                        cu,
                        repo.getId(),
                        run.getId(),
                        symbols
                );
                if (!relationships.isEmpty()) {
                    relationshipRepository.saveAll(relationships);
                }

                // Extract Quality Findings
                List<QualityFindingEntity> qualityFindings = qualityRuleEngine.analyzeQuality(
                        cu,
                        repo.getId(),
                        run.getId(),
                        file.getRelativePath(),
                        symbols
                );
                if (!qualityFindings.isEmpty()) {
                    qualityFindingRepository.saveAll(qualityFindings);
                    warningCount += qualityFindings.size();
                }

                // Compute Method Metrics & Symbol Metrics
                int fileClasses = 0;
                int fileMethods = 0;
                int fileTotalCc = 0;

                // Find all callable declarations in AST
                List<CallableDeclaration<?>> callables = new ArrayList<>();
                callables.addAll(cu.findAll(MethodDeclaration.class));
                callables.addAll(cu.findAll(ConstructorDeclaration.class));

                Map<String, CallableDeclaration<?>> callableMap = new HashMap<>();
                for (CallableDeclaration<?> cd : callables) {
                    callableMap.put(JavaSymbolExtractor.getCallableSignature(cd), cd);
                }

                for (SymbolEntity symbol : symbols) {
                    if (symbol.getKind() == SymbolKind.CLASS || symbol.getKind() == SymbolKind.INTERFACE
                            || symbol.getKind() == SymbolKind.ENUM || symbol.getKind() == SymbolKind.RECORD) {
                        fileClasses++;
                        totalClasses++;
                    } else if (symbol.getKind() == SymbolKind.METHOD || symbol.getKind() == SymbolKind.CONSTRUCTOR) {
                        fileMethods++;
                        totalMethods++;

                        CallableDeclaration<?> matchingDecl = callableMap.get(symbol.getSignature());
                        int cc = 1;
                        int depth = 0;
                        MetricsCalculator.HalsteadResult halstead;

                        if (matchingDecl != null) {
                            cc = metricsCalculator.calculateCyclomaticComplexity(matchingDecl);
                            depth = metricsCalculator.calculateNestingDepth(matchingDecl);
                            halstead = metricsCalculator.calculateHalstead(matchingDecl);
                        } else {
                            halstead = new MetricsCalculator.HalsteadResult(0, 0, 0, 0);
                        }

                        int symLoc = (symbol.getEndLine() != null && symbol.getStartLine() != null)
                                ? Math.max(1, symbol.getEndLine() - symbol.getStartLine() + 1)
                                : 1;
                        double symMi = metricsCalculator.calculateMaintainabilityIndex(halstead.getVolume(), cc, symLoc);

                        symbolMetricsRepository.save(new SymbolMetricsEntity(
                                UUID.randomUUID(),
                                repo.getId(),
                                run.getId(),
                                symbol.getId(),
                                symLoc,
                                cc,
                                depth,
                                symbol.getParameterCount(),
                                halstead.getVolume(),
                                symMi
                        ));

                        fileTotalCc += cc;
                        methodComplexities.add((double) cc);
                    }
                }

                // Compute File-level Halstead and MI
                MetricsCalculator.HalsteadResult fileHalstead = metricsCalculator.calculateHalstead(cu);
                double fileMi = metricsCalculator.calculateMaintainabilityIndex(fileHalstead.getVolume(), Math.max(1, fileTotalCc), fileLoc);
                fileMaintainabilities.add(fileMi);

                fileMetricsRepository.save(new FileMetricsEntity(
                        UUID.randomUUID(),
                        repo.getId(),
                        run.getId(),
                        file.getRelativePath(),
                        fileLoc,
                        fileLloc,
                        fileTotalCc,
                        fileClasses,
                        fileMethods,
                        fileHalstead.getVolume(),
                        fileMi
                ));
            } else {
                // Non-Java file
                fileMetricsRepository.save(new FileMetricsEntity(
                        UUID.randomUUID(),
                        repo.getId(),
                        run.getId(),
                        file.getRelativePath(),
                        fileLoc,
                        fileLloc,
                        0,
                        0,
                        0,
                        0.0,
                        100.0
                ));
            }

            filesAnalyzed++;
        }

        // Aggregate repository metrics
        run.setFilesAnalyzed(filesAnalyzed);
        run.setFilesSkipped(filesSkipped);
        run.setErrorCount(errorCount);
        run.setWarningCount(warningCount);
        run.setTotalLoc(totalLoc);
        run.setTotalClasses(totalClasses);
        run.setTotalMethods(totalMethods);

        double avgCc = methodComplexities.isEmpty() ? 0.0 : methodComplexities.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
        run.setAverageComplexity(Math.round(avgCc * 100.0) / 100.0);

        double avgMi = fileMaintainabilities.isEmpty() ? 100.0 : fileMaintainabilities.stream().mapToDouble(Double::doubleValue).average().orElse(100.0);
        run.setMaintainabilityIndex(Math.round(avgMi * 100.0) / 100.0);

        run.setStatus(AnalysisStatus.COMPLETED);
        run.setCompletedAt(Instant.now());
        analysisRunRepository.save(run);
    }

    @Transactional(readOnly = true)
    public Page<AnalysisRunEntity> getAnalysisRuns(UUID repositoryId, UserEntity requester, Pageable pageable) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);
        return analysisRunRepository.findByRepositoryIdOrderByStartedAtDesc(repositoryId, pageable);
    }

    @Transactional(readOnly = true)
    public AnalysisRunEntity getAnalysisRun(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);
        return analysisRunRepository.findByIdAndRepositoryId(analysisId, repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("AnalysisRun", analysisId));
    }

    @Transactional(readOnly = true)
    public Page<SymbolEntity> getSymbols(UUID repositoryId, UUID analysisId, SymbolKind kind, UserEntity requester, Pageable pageable) {
        getAnalysisRun(repositoryId, analysisId, requester);
        if (kind != null) {
            return symbolRepository.findByAnalysisIdAndKind(analysisId, kind, pageable);
        }
        return symbolRepository.findByAnalysisId(analysisId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<RelationshipEntity> getRelationships(UUID repositoryId, UUID analysisId, RelationshipType type, UserEntity requester, Pageable pageable) {
        getAnalysisRun(repositoryId, analysisId, requester);
        if (type != null) {
            return relationshipRepository.findByAnalysisIdAndRelationshipType(analysisId, type, pageable);
        }
        return relationshipRepository.findByAnalysisId(analysisId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<FileMetricsEntity> getFileMetrics(UUID repositoryId, UUID analysisId, UserEntity requester, Pageable pageable) {
        getAnalysisRun(repositoryId, analysisId, requester);
        return fileMetricsRepository.findByAnalysisId(analysisId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<QualityFindingEntity> getQualityFindings(UUID repositoryId, UUID analysisId, Severity severity, String ruleId, UserEntity requester, Pageable pageable) {
        getAnalysisRun(repositoryId, analysisId, requester);
        if (severity != null) {
            return qualityFindingRepository.findByAnalysisIdAndSeverity(analysisId, severity, pageable);
        }
        if (ruleId != null && !ruleId.isBlank()) {
            return qualityFindingRepository.findByAnalysisIdAndRuleId(analysisId, ruleId, pageable);
        }
        return qualityFindingRepository.findByAnalysisId(analysisId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<SecretFindingEntity> getSecretFindings(UUID repositoryId, UUID analysisId, UserEntity requester, Pageable pageable) {
        getAnalysisRun(repositoryId, analysisId, requester);
        return secretFindingRepository.findByAnalysisId(analysisId, pageable);
    }

    private void validateOwnership(RepositoryEntity repo, UserEntity requester) {
        if (requester.getRole() == Role.ROLE_ADMIN) {
            return;
        }
        if (!repo.getOwner().getId().equals(requester.getId())) {
            auditService.logEvent(
                    requester.getEmail(),
                    "UNAUTHORIZED_ACCESS",
                    "WARNING",
                    null,
                    MDC.get("correlationId"),
                    "User attempted to trigger analysis on unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to trigger analysis for this repository");
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
                    "User attempted to view analysis for unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to view analysis for this repository");
        }
    }
}
