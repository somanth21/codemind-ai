package com.codemind.security.analysis.rules;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.MethodCallExpr;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class SensitiveLoggingRule implements SecurityRule {

    private static final Set<String> LOG_METHODS = Set.of(
            "info", "debug", "warn", "error", "trace", "println", "print", "printf"
    );

    private static final List<String> SENSITIVE_KEYWORDS = List.of(
            "password", "pwd", "secret", "apikey", "api_key", "token", "authtoken",
            "auth_token", "creditcard", "ssn", "privatekey", "bearer"
    );

    @Override
    public String getRuleId() {
        return "SEC_SENSITIVE_LOGGING";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.ERROR_HANDLING;
    }

    @Override
    public Severity getSeverity() {
        return Severity.MEDIUM;
    }

    @Override
    public String getDescription() {
        return "Detects logging statements outputting variables or expressions with names indicating sensitive information (passwords, tokens, keys, secrets).";
    }

    @Override
    public String getRemediation() {
        return "Sanitize, mask, or omit sensitive credentials and tokens prior to logging or console output.";
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
        if (cu == null) {
            return findings;
        }

        for (MethodCallExpr call : cu.findAll(MethodCallExpr.class)) {
            String methodName = call.getNameAsString();
            if (LOG_METHODS.contains(methodName)) {
                for (Expression arg : call.getArguments()) {
                    String argStr = arg.toString().toLowerCase(Locale.ROOT);
                    for (String keyword : SENSITIVE_KEYWORDS) {
                        if (argStr.contains(keyword)) {
                            int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                            int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);

                            findings.add(new SecurityFindingEntity(
                                    UUID.randomUUID(),
                                    repositoryId,
                                    analysisId,
                                    null,
                                    getRuleId(),
                                    Severity.MEDIUM,
                                    getCategory(),
                                    "Sensitive parameter or variable ('" + keyword + "') logged in " + methodName + "() statement",
                                    getDescription(),
                                    getRemediation(),
                                    filePath,
                                    null,
                                    startLine,
                                    endLine,
                                    truncate(call.toString(), 250),
                                    "HIGH",
                                    FindingStatus.OPEN
                            ));
                            break; // Avoid duplicate findings per call
                        }
                    }
                }
            }
        }

        return findings;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
