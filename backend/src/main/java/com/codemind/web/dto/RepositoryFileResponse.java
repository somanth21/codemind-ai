package com.codemind.web.dto;

import com.codemind.domain.model.RepositoryFileEntity;

import java.time.Instant;
import java.util.UUID;

public record RepositoryFileResponse(
        UUID id,
        String relativePath,
        String fileName,
        String extension,
        String language,
        long sizeBytes,
        boolean binary,
        String sha256,
        Instant createdAt
) {
    public static RepositoryFileResponse fromEntity(RepositoryFileEntity entity) {
        return new RepositoryFileResponse(
                entity.getId(),
                entity.getRelativePath(),
                entity.getFileName(),
                entity.getExtension(),
                entity.getLanguage(),
                entity.getSizeBytes(),
                entity.isBinary(),
                entity.getSha256(),
                entity.getCreatedAt()
        );
    }
}
