package com.codemind.web.dto;

import com.codemind.domain.model.RepositoryEntity;

import java.time.Instant;
import java.util.UUID;

public record RepositoryDetailResponse(
        UUID id,
        String name,
        String sourceType,
        String status,
        int fileCount,
        long totalSizeBytes,
        Instant createdAt,
        Instant updatedAt,
        Instant ingestionStartedAt,
        Instant ingestionCompletedAt,
        String failureReason,
        UUID ownerId,
        String ownerEmail
) {
    public static RepositoryDetailResponse fromEntity(RepositoryEntity entity) {
        return new RepositoryDetailResponse(
                entity.getId(),
                entity.getName(),
                entity.getSourceType(),
                entity.getStatus(),
                entity.getFileCount(),
                entity.getTotalSizeBytes(),
                entity.getCreatedAt(),
                entity.getUpdatedAt(),
                entity.getIngestionStartedAt(),
                entity.getIngestionCompletedAt(),
                entity.getFailureReason(),
                entity.getOwner().getId(),
                entity.getOwner().getEmail()
        );
    }
}
