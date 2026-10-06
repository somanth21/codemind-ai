package com.codemind.web.dto;

import com.codemind.domain.model.FileMetricsEntity;

import java.util.UUID;

public record FileMetricsResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        String filePath,
        int loc,
        int lloc,
        int cyclomaticComplexity,
        int classCount,
        int methodCount,
        double halsteadVolume,
        double maintainabilityIndex
) {
    public static FileMetricsResponse fromEntity(FileMetricsEntity entity) {
        return new FileMetricsResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getFilePath(),
                entity.getLoc(),
                entity.getLloc(),
                entity.getCyclomaticComplexity(),
                entity.getClassCount(),
                entity.getMethodCount(),
                entity.getHalsteadVolume(),
                entity.getMaintainabilityIndex()
        );
    }
}
