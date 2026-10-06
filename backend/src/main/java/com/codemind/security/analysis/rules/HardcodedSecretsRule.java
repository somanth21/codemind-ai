package com.codemind.security.analysis.rules;

import com.codemind.analyzer.SecretScanner;
import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecretFindingEntity;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class HardcodedSecretsRule implements SecurityRule {

    private final SecretScanner secretScanner;

    public HardcodedSecretsRule(SecretScanner secretScanner) {
        this.secretScanner = secretScanner;
    }

    @Override
    public String getRuleId() {
        return "SEC_HARDCODED_CREDENTIAL";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.SECRETS;
    }

    @Override
    public Severity getSeverity() {
        return Severity.CRITICAL;
    }

    @Override
    public String getDescription() {
        return "Detects hardcoded private keys, cloud access tokens, API credentials, and secrets embedded in source code.";
    }

    @Override
    public String getRemediation() {
        return "Store credentials and secrets in a secure secret manager or external environment variables. Never commit credentials to source control.";
    }

    @Override
    public String getConfidence() {
        return "HIGH";
    }

    @Override
    public List<SecurityFindingEntity> analyze(
            CompilationUnit cu,
            String filePath,
            UUID repositoryId,
            UUID analysisId,
            Map<String, UUID> fqnToSymbolId,
            String sourceCode
    ) {
        List<SecurityFindingEntity> findings = new ArrayList<>();
        if (sourceCode == null || sourceCode.isBlank()) {
            return findings;
        }

        List<SecretFindingEntity> secrets = secretScanner.scanContent(sourceCode, repositoryId, analysisId, filePath);
        for (SecretFindingEntity s : secrets) {
            findings.add(new SecurityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    null,
                    "SEC_HARDCODED_" + s.getRuleId(),
                    s.getSeverity(),
                    SecurityCategory.SECRETS,
                    "Hardcoded secret detected matching pattern " + s.getRuleId(),
                    getDescription(),
                    getRemediation(),
                    filePath,
                    null,
                    s.getLineNumber(),
                    s.getLineNumber(),
                    s.getRedactedEvidence(),
                    s.getConfidence(),
                    FindingStatus.OPEN
            ));
        }

        return findings;
    }
}
