package com.codemind.web.dto;

import com.codemind.domain.model.SecretFindingEntity;

import java.util.UUID;

public record SecretFindingResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        String filePath,
        String ruleId,
        String severity,
        String confidence,
        Integer lineNumber,
        String redactedEvidence
) {
    public static SecretFindingResponse fromEntity(SecretFindingEntity entity) {
        return new SecretFindingResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getFilePath(),
                entity.getRuleId(),
                entity.getSeverity() != null ? entity.getSeverity().name() : null,
                entity.getConfidence(),
                entity.getLineNumber(),
                entity.getRedactedEvidence()
        );
    }
}
