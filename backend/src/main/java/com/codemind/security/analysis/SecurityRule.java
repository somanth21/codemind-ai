package com.codemind.security.analysis;

import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.github.javaparser.ast.CompilationUnit;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Base contract for deterministic repository security rules.
 */
public interface SecurityRule {
    String getRuleId();
    SecurityCategory getCategory();
    Severity getSeverity();
    String getDescription();
    String getRemediation();
    String getConfidence();

    List<SecurityFindingEntity> analyze(
            CompilationUnit cu,
            String filePath,
            UUID repositoryId,
            UUID analysisId,
            Map<String, UUID> fqnToSymbolId,
            String sourceCode
    );
}
