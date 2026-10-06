package com.codemind.web.dto;

import com.codemind.domain.model.AnalysisRunEntity;

import java.time.Instant;
import java.util.UUID;

public record AnalysisRunResponse(
        UUID id,
        UUID repositoryId,
        String status,
        Instant startedAt,
        Instant completedAt,
        int filesAnalyzed,
        int filesSkipped,
        int errorCount,
        int warningCount,
        long totalLoc,
        int totalClasses,
        int totalMethods,
        double averageComplexity,
        double maintainabilityIndex,
        String failureReason,
        Instant createdAt
) {
    public static AnalysisRunResponse fromEntity(AnalysisRunEntity entity) {
        return new AnalysisRunResponse(
                entity.getId(),
                entity.getRepository().getId(),
                entity.getStatus().name(),
                entity.getStartedAt(),
                entity.getCompletedAt(),
                entity.getFilesAnalyzed(),
                entity.getFilesSkipped(),
                entity.getErrorCount(),
                entity.getWarningCount(),
                entity.getTotalLoc(),
                entity.getTotalClasses(),
                entity.getTotalMethods(),
                entity.getAverageComplexity(),
                entity.getMaintainabilityIndex(),
                entity.getFailureReason(),
                entity.getCreatedAt()
        );
    }
}
