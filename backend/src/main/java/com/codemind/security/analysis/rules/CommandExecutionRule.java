package com.codemind.security.analysis.rules;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.MethodCallExpr;
import com.github.javaparser.ast.expr.ObjectCreationExpr;
import com.github.javaparser.ast.expr.StringLiteralExpr;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class CommandExecutionRule implements SecurityRule {

    @Override
    public String getRuleId() {
        return "SEC_COMMAND_EXECUTION";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.INJECTION;
    }

    @Override
    public Severity getSeverity() {
        return Severity.HIGH;
    }

    @Override
    public String getDescription() {
        return "Detects invocation of operating system commands via Runtime.exec() or ProcessBuilder, which may lead to command injection if arguments are externally influenced.";
    }

    @Override
    public String getRemediation() {
        return "Avoid invocation of OS-level processes. If command execution is necessary, use strongly-typed Java library APIs or strictly validate arguments against an allowlist without shell interpolation.";
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

        // 1. Check Runtime.exec calls
        for (MethodCallExpr call : cu.findAll(MethodCallExpr.class)) {
            if ("exec".equals(call.getNameAsString())) {
                boolean isRuntime = call.getScope()
                        .map(s -> s.toString().contains("Runtime") || s.toString().contains("getRuntime"))
                        .orElse(true);

                if (isRuntime) {
                    boolean hasDynamicArgs = call.getArguments().stream().anyMatch(arg -> !(arg instanceof StringLiteralExpr));
                    Severity sev = hasDynamicArgs ? Severity.HIGH : Severity.MEDIUM;
                    int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                    int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);
                    String snippet = truncate(call.toString(), 250);

                    findings.add(new SecurityFindingEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            null,
                            getRuleId(),
                            sev,
                            getCategory(),
                            hasDynamicArgs
                                    ? "Potential command injection via Runtime.exec() with dynamic arguments"
                                    : "OS command execution via Runtime.exec() requiring review",
                            getDescription(),
                            getRemediation(),
                            filePath,
                            null,
                            startLine,
                            endLine,
                            snippet,
                            hasDynamicArgs ? "HIGH" : "MEDIUM",
                            FindingStatus.OPEN
                    ));
                }
            }
        }

        // 2. Check ProcessBuilder creations
        for (ObjectCreationExpr creation : cu.findAll(ObjectCreationExpr.class)) {
            if ("ProcessBuilder".equals(creation.getTypeAsString())) {
                boolean hasDynamicArgs = creation.getArguments().stream().anyMatch(arg -> !(arg instanceof StringLiteralExpr));
                Severity sev = hasDynamicArgs ? Severity.HIGH : Severity.MEDIUM;
                int startLine = creation.getRange().map(r -> r.begin.line).orElse(1);
                int endLine = creation.getRange().map(r -> r.end.line).orElse(startLine);
                String snippet = truncate(creation.toString(), 250);

                findings.add(new SecurityFindingEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        null,
                        getRuleId(),
                        sev,
                        getCategory(),
                        hasDynamicArgs
                                ? "Potential command injection via ProcessBuilder with dynamic arguments"
                                : "ProcessBuilder instantiation requiring architectural review",
                        getDescription(),
                        getRemediation(),
                        filePath,
                        null,
                        startLine,
                        endLine,
                        snippet,
                        hasDynamicArgs ? "HIGH" : "MEDIUM",
                        FindingStatus.OPEN
                ));
            }
        }

        return findings;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
