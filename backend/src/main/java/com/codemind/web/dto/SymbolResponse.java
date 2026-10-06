package com.codemind.web.dto;

import com.codemind.domain.model.SymbolEntity;

import java.util.UUID;

public record SymbolResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        String filePath,
        String fqn,
        String name,
        String kind,
        UUID parentSymbolId,
        Integer startLine,
        Integer endLine,
        String visibility,
        boolean isStatic,
        boolean isFinal,
        boolean isAbstract,
        String signature,
        String returnType,
        int parameterCount
) {
    public static SymbolResponse fromEntity(SymbolEntity entity) {
        return new SymbolResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getFilePath(),
                entity.getFqn(),
                entity.getName(),
                entity.getKind() != null ? entity.getKind().name() : null,
                entity.getParentSymbolId(),
                entity.getStartLine(),
                entity.getEndLine(),
                entity.getVisibility() != null ? entity.getVisibility().name() : null,
                entity.isStatic(),
                entity.isFinal(),
                entity.isAbstract(),
                entity.getSignature(),
                entity.getReturnType(),
                entity.getParameterCount()
        );
    }
}
