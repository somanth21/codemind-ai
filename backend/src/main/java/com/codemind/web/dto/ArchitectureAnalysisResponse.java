package com.codemind.web.dto;

import com.codemind.architecture.model.ArchitectureHotspot;
import com.codemind.architecture.model.ArchitectureSmell;
import com.codemind.architecture.model.DependencyCycle;
import com.codemind.architecture.model.PackageCouplingMetrics;
import com.codemind.domain.model.ArchitectureAnalysisEntity;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record ArchitectureAnalysisResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        int totalPackages,
        int totalClasses,
        int totalInterfaces,
        int totalDependencies,
        int cycleCount,
        int hotspotCount,
        int smellCount,
        double averageComplexity,
        double averageMaintainability,
        List<PackageCouplingMetrics> packageMetrics,
        List<DependencyCycle> cycles,
        List<ArchitectureHotspot> hotspots,
        List<ArchitectureSmell> smells,
        String status,
        Instant createdAt
) {
    public static ArchitectureAnalysisResponse fromEntity(ArchitectureAnalysisEntity entity, ObjectMapper objectMapper) {
        if (entity == null) return null;

        List<PackageCouplingMetrics> packageMetrics = Collections.emptyList();
        List<DependencyCycle> cycles = Collections.emptyList();
        List<ArchitectureHotspot> hotspots = Collections.emptyList();
        List<ArchitectureSmell> smells = Collections.emptyList();

        if (objectMapper != null) {
            try {
                if (entity.getPackageStatsJson() != null && !entity.getPackageStatsJson().isBlank()) {
                    packageMetrics = objectMapper.readValue(entity.getPackageStatsJson(), new TypeReference<>() {});
                }
            } catch (Exception ignored) {}
            try {
                if (entity.getCyclesJson() != null && !entity.getCyclesJson().isBlank()) {
                    cycles = objectMapper.readValue(entity.getCyclesJson(), new TypeReference<>() {});
                }
            } catch (Exception ignored) {}
            try {
                if (entity.getHotspotsJson() != null && !entity.getHotspotsJson().isBlank()) {
                    hotspots = objectMapper.readValue(entity.getHotspotsJson(), new TypeReference<>() {});
                }
            } catch (Exception ignored) {}
            try {
                if (entity.getSmellsJson() != null && !entity.getSmellsJson().isBlank()) {
                    smells = objectMapper.readValue(entity.getSmellsJson(), new TypeReference<>() {});
                }
            } catch (Exception ignored) {}
        }

        return new ArchitectureAnalysisResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getPackageCount(),
                entity.getClassCount(),
                entity.getInterfaceCount(),
                entity.getDependencyCount(),
                entity.getCycleCount(),
                entity.getHotspotCount(),
                entity.getSmellCount(),
                entity.getAverageComplexity(),
                entity.getAverageMaintainability(),
                packageMetrics,
                cycles,
                hotspots,
                smells,
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }
}
