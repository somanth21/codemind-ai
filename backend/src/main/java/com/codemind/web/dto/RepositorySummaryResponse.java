package com.codemind.web.dto;

import com.codemind.domain.model.RepositoryEntity;

import java.time.Instant;
import java.util.UUID;

public record RepositorySummaryResponse(
        UUID id,
        String name,
        String sourceType,
        String status,
        int fileCount,
        long totalSizeBytes,
        Instant createdAt,
        Instant ingestionCompletedAt
) {
    public static RepositorySummaryResponse fromEntity(RepositoryEntity entity) {
        return new RepositorySummaryResponse(
                entity.getId(),
                entity.getName(),
                entity.getSourceType(),
                entity.getStatus(),
                entity.getFileCount(),
                entity.getTotalSizeBytes(),
                entity.getCreatedAt(),
                entity.getIngestionCompletedAt()
        );
    }
}
