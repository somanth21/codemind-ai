package com.codemind.web.dto.admin;

import com.codemind.domain.model.RepositoryEntity;
import java.time.Instant;
import java.util.UUID;

public record RepositoryAdminDto(
        UUID id,
        String name,
        String sourceType,
        String status,
        UUID ownerId,
        String ownerEmail,
        int fileCount,
        long totalSizeBytes,
        Instant createdAt,
        Instant lastAnalyzedAt
) {
    public static RepositoryAdminDto fromEntity(RepositoryEntity repo, String ownerEmail, Instant lastAnalyzedAt) {
        return new RepositoryAdminDto(
                repo.getId(),
                repo.getName(),
                repo.getSourceType(),
                repo.getStatus(),
                repo.getOwner() != null ? repo.getOwner().getId() : null,
                ownerEmail,
                repo.getFileCount(),
                repo.getTotalSizeBytes(),
                repo.getCreatedAt(),
                lastAnalyzedAt
        );
    }
}