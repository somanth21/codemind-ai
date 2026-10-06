package com.codemind.web.dto;

import com.codemind.domain.model.RelationshipEntity;

import java.util.UUID;

public record RelationshipResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        UUID sourceSymbolId,
        UUID targetSymbolId,
        String sourceFqn,
        String targetFqn,
        String relationshipType,
        String confidence,
        Integer lineNumber
) {
    public static RelationshipResponse fromEntity(RelationshipEntity entity) {
        return new RelationshipResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getSourceSymbolId(),
                entity.getTargetSymbolId(),
                entity.getSourceFqn(),
                entity.getTargetFqn(),
                entity.getRelationshipType() != null ? entity.getRelationshipType().name() : null,
                entity.getConfidence() != null ? entity.getConfidence().name() : null,
                entity.getLineNumber()
        );
    }
}
