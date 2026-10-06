package com.codemind.architecture.service;

import com.codemind.architecture.graph.CycleDetectionService;
import com.codemind.architecture.graph.DependencyGraphBuilder;
import com.codemind.architecture.model.*;
import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.common.exception.ValidationException;
import com.codemind.domain.model.*;
import com.codemind.domain.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class ArchitectureService {

    private static final Logger log = LoggerFactory.getLogger(ArchitectureService.class);

    private final RepositoryEntityRepository repositoryEntityRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final SymbolRepository symbolRepository;
    private final RelationshipRepository relationshipRepository;
    private final FileMetricsRepository fileMetricsRepository;
    private final ArchitectureAnalysisRepository architectureAnalysisRepository;

    private final DependencyGraphBuilder graphBuilder;
    private final CycleDetectionService cycleDetectionService;
    private final PackageAnalysisService packageAnalysisService;
    private final ArchitectureSmellDetector smellDetector;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    public ArchitectureService(
            RepositoryEntityRepository repositoryEntityRepository,
            AnalysisRunRepository analysisRunRepository,
            SymbolRepository symbolRepository,
            RelationshipRepository relationshipRepository,
            FileMetricsRepository fileMetricsRepository,
            ArchitectureAnalysisRepository architectureAnalysisRepository,
            DependencyGraphBuilder graphBuilder,
            CycleDetectionService cycleDetectionService,
            PackageAnalysisService packageAnalysisService,
            ArchitectureSmellDetector smellDetector,
            AuditService auditService,
            ObjectMapper objectMapper
    ) {
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.symbolRepository = symbolRepository;
        this.relationshipRepository = relationshipRepository;
        this.fileMetricsRepository = fileMetricsRepository;
        this.architectureAnalysisRepository = architectureAnalysisRepository;
        this.graphBuilder = graphBuilder;
        this.cycleDetectionService = cycleDetectionService;
        this.packageAnalysisService = packageAnalysisService;
        this.smellDetector = smellDetector;
        this.auditService = auditService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ArchitectureAnalysisEntity analyzeArchitecture(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        AnalysisRunEntity run;
        if (analysisId != null) {
            run = analysisRunRepository.findByIdAndRepositoryId(analysisId, repositoryId)
                    .orElseThrow(() -> new ResourceNotFoundException("AnalysisRun", analysisId));
        } else {
            run = analysisRunRepository.findFirstByRepositoryIdOrderByStartedAtDesc(repositoryId)
                    .orElseThrow(() -> new ValidationException("No static analysis runs found for repository. Analyze repository first."));
        }

        auditService.logEvent(
                requester.getEmail(),
                "ARCHITECTURE_ANALYSIS_STARTED",
                "INFO",
                null,
                MDC.get("correlationId"),
                "Initiating architecture analysis for repository " + repositoryId + ", run " + run.getId()
        );

        List<SymbolEntity> symbols = symbolRepository.findByAnalysisId(run.getId());
        List<RelationshipEntity> relationships = relationshipRepository.findByAnalysisId(run.getId());
        List<FileMetricsEntity> fileMetrics = fileMetricsRepository.findByAnalysisId(run.getId());

        // 1. Build Graph
        ArchitectureGraph graph = graphBuilder.buildGraph(symbols, relationships);

        // 2. Cycle Detection
        List<DependencyCycle> cycles = cycleDetectionService.detectCycles(graph);

        // 3. Package Coupling Metrics
        List<PackageCouplingMetrics> packageMetrics = packageAnalysisService.analyzePackages(symbols, relationships);

        // 4. Hotspots Calculation
        List<ArchitectureHotspot> hotspots = calculateHotspots(graph);

        // 5. Smell Detection
        List<ArchitectureSmell> smells = smellDetector.detectSmells(cycles, packageMetrics, hotspots, fileMetrics);

        // Counts & Averages
        long classCount = symbols.stream().filter(s -> s.getKind() == SymbolKind.CLASS || s.getKind() == SymbolKind.RECORD).count();
        long interfaceCount = symbols.stream().filter(s -> s.getKind() == SymbolKind.INTERFACE).count();
        double avgComplexity = fileMetrics.stream().mapToInt(FileMetricsEntity::getCyclomaticComplexity).average().orElse(0.0);
        double avgMaintainability = fileMetrics.stream().mapToDouble(FileMetricsEntity::getMaintainabilityIndex).average().orElse(0.0);

        String packageStatsJson = toJson(packageMetrics);
        String cyclesJson = toJson(cycles);
        String hotspotsJson = toJson(hotspots);
        String smellsJson = toJson(smells);
        String graphJson = toJson(graph);
        String metricsJson = toJson(Map.of(
                "packageCount", packageMetrics.size(),
                "classCount", classCount,
                "interfaceCount", interfaceCount,
                "dependencyCount", graph.edges().size(),
                "cycleCount", cycles.size(),
                "hotspotCount", hotspots.size(),
                "smellCount", smells.size(),
                "averageComplexity", avgComplexity,
                "averageMaintainability", avgMaintainability
        ));

        ArchitectureAnalysisEntity entity = new ArchitectureAnalysisEntity(
                UUID.randomUUID(),
                repositoryId,
                run.getId(),
                packageMetrics.size(),
                (int) classCount,
                (int) interfaceCount,
                graph.edges().size(),
                cycles.size(),
                hotspots.size(),
                smells.size(),
                avgComplexity,
                avgMaintainability,
                packageStatsJson,
                cyclesJson,
                hotspotsJson,
                smellsJson,
                metricsJson,
                graphJson,
                "COMPLETED"
        );
        entity = architectureAnalysisRepository.save(entity);

        auditService.logEvent(
                requester.getEmail(),
                "ARCHITECTURE_ANALYSIS_COMPLETED",
                "SUCCESS",
                null,
                MDC.get("correlationId"),
                String.format("Architecture intelligence complete: %d packages, %d cycles, %d hotspots, %d smells",
                        packageMetrics.size(), cycles.size(), hotspots.size(), smells.size())
        );

        return entity;
    }

    @Transactional(readOnly = true)
    public Page<ArchitectureAnalysisEntity> getArchitectureAnalyses(UUID repositoryId, UserEntity requester, Pageable pageable) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return architectureAnalysisRepository.findByRepositoryIdOrderByCreatedAtDesc(repositoryId, pageable);
    }

    @Transactional(readOnly = true)
    public ArchitectureAnalysisEntity getArchitectureAnalysis(UUID repositoryId, UUID analysisId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        validateReadAccess(repo, requester);

        return architectureAnalysisRepository.findById(analysisId)
                .filter(a -> a.getRepositoryId().equals(repositoryId))
                .or(() -> architectureAnalysisRepository.findFirstByRepositoryIdAndAnalysisIdOrderByCreatedAtDesc(repositoryId, analysisId))
                .orElseThrow(() -> new ResourceNotFoundException("ArchitectureAnalysis", analysisId));
    }

    @Transactional(readOnly = true)
    public ArchitectureGraph getArchitectureGraph(UUID repositoryId, UUID analysisId, UserEntity requester) {
        ArchitectureAnalysisEntity entity = getArchitectureAnalysis(repositoryId, analysisId, requester);
        try {
            return objectMapper.readValue(entity.getGraphJson(), ArchitectureGraph.class);
        } catch (Exception e) {
            log.warn("Could not deserialize graph JSON for analysis {}: {}", analysisId, e.getMessage());
            return new ArchitectureGraph(List.of(), List.of());
        }
    }

    private List<ArchitectureHotspot> calculateHotspots(ArchitectureGraph graph) {
        Map<String, Integer> fanInMap = new HashMap<>();
        Map<String, Integer> fanOutMap = new HashMap<>();
        Map<String, String> filePathMap = new HashMap<>();

        for (ArchitectureGraph.GraphNode node : graph.nodes()) {
            if (node.metadata() != null && node.metadata().containsKey("filePath")) {
                filePathMap.put(node.id(), String.valueOf(node.metadata().get("filePath")));
            }
        }

        for (ArchitectureGraph.GraphEdge edge : graph.edges()) {
            fanOutMap.merge(edge.source(), 1, Integer::sum);
            fanInMap.merge(edge.target(), 1, Integer::sum);
        }

        List<ArchitectureHotspot> hotspots = new ArrayList<>();
        Set<String> allNodes = new HashSet<>();
        allNodes.addAll(fanInMap.keySet());
        allNodes.addAll(fanOutMap.keySet());

        for (String node : allNodes) {
            int in = fanInMap.getOrDefault(node, 0);
            int out = fanOutMap.getOrDefault(node, 0);
            int total = in + out;

            if (in >= 5 && out >= 5) {
                hotspots.add(new ArchitectureHotspot(
                        node, filePathMap.getOrDefault(node, "unknown"), in, out, total,
                        "HUB",
                        "High central hub: class is both heavily invoked (" + in + ") and depends on many types (" + out + ")."
                ));
            } else if (out >= 10) {
                hotspots.add(new ArchitectureHotspot(
                        node, filePathMap.getOrDefault(node, "unknown"), in, out, total,
                        "HIGH_FAN_OUT",
                        "High fan-out: class depends on " + out + " external types, creating high fragility."
                ));
            } else if (in >= 5 && out <= 2) {
                hotspots.add(new ArchitectureHotspot(
                        node, filePathMap.getOrDefault(node, "unknown"), in, out, total,
                        "CORE_ABSTRACTION",
                        "Core abstraction: heavily relied upon (" + in + " incoming callers) with minimal external dependencies."
                ));
            }
        }

        return hotspots;
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.error("Failed to serialize architecture data to JSON: {}", e.getMessage());
            return "{}";
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
                    "User attempted to access unauthorized architecture data: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to access this repository");
        }
    }
}
