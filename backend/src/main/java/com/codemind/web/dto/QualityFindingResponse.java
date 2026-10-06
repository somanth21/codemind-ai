package com.codemind.web.dto;

import com.codemind.domain.model.QualityFindingEntity;

import java.util.UUID;

public record QualityFindingResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        String filePath,
        UUID symbolId,
        String ruleId,
        String severity,
        String title,
        String description,
        Integer lineNumber,
        String evidence
) {
    public static QualityFindingResponse fromEntity(QualityFindingEntity entity) {
        return new QualityFindingResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getFilePath(),
                entity.getSymbolId(),
                entity.getRuleId(),
                entity.getSeverity() != null ? entity.getSeverity().name() : null,
                entity.getTitle(),
                entity.getDescription(),
                entity.getLineNumber(),
                entity.getEvidence()
        );
    }
}
