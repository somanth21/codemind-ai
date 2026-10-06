package com.codemind.web.dto;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;

import java.time.Instant;
import java.util.UUID;

public record SecurityFindingResponse(
        UUID id,
        UUID repositoryId,
        UUID analysisId,
        UUID securityAnalysisId,
        String ruleId,
        String ruleName,
        Severity severity,
        SecurityCategory category,
        String message,
        String remediation,
        String filePath,
        Integer lineNumber,
        Integer endLineNumber,
        String evidenceSnippet,
        String confidence,
        FindingStatus status,
        Instant createdAt
) {
    public static SecurityFindingResponse fromEntity(SecurityFindingEntity entity) {
        if (entity == null) return null;
        return new SecurityFindingResponse(
                entity.getId(),
                entity.getRepositoryId(),
                entity.getAnalysisId(),
                entity.getSecurityAnalysisId(),
                entity.getRuleId(),
                entity.getRuleId(),
                entity.getSeverity(),
                entity.getCategory(),
                entity.getMessage(),
                entity.getRemediation(),
                entity.getFilePath(),
                entity.getStartLine(),
                entity.getEndLine(),
                entity.getEvidenceSnippet(),
                entity.getConfidence(),
                entity.getStatus(),
                entity.getCreatedAt()
        );
    }
}
