package com.codemind.web.dto;

import com.codemind.domain.model.SecurityAnalysisEntity;

import java.time.Instant;
import java.util.UUID;

public record SecurityAnalysisResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        int totalFindings,
        int criticalCount,
        int highCount,
        int mediumCount,
        int lowCount,
        int infoCount,
        double riskScore,
        String status,
        Instant createdAt
) {
    public static SecurityAnalysisResponse fromEntity(SecurityAnalysisEntity entity) {
        if (entity == null) return null;
        return new SecurityAnalysisResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getTotalFindings(),
                entity.getCriticalCount(),
                entity.getHighCount(),
                entity.getMediumCount(),
                entity.getLowCount(),
                entity.getInfoCount(),
                entity.getRiskScore(),
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }
}
