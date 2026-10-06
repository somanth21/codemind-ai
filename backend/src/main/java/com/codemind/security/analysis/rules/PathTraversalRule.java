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
import java.util.Set;
import java.util.UUID;

@Component
public class PathTraversalRule implements SecurityRule {

    private static final Set<String> RISKY_TYPES = Set.of(
            "File", "FileInputStream", "FileOutputStream", "FileReader", "FileWriter"
    );

    @Override
    public String getRuleId() {
        return "SEC_PATH_TRAVERSAL";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.FILE_ACCESS;
    }

    @Override
    public Severity getSeverity() {
        return Severity.HIGH;
    }

    @Override
    public String getDescription() {
        return "Detects direct file system operations with dynamically constructed or unvalidated path parameters that may allow path traversal attacks.";
    }

    @Override
    public String getRemediation() {
        return "Canonicalize and normalize paths using Path.normalize(), and verify that the resolved path stays strictly within the designated parent directory using startsWith() or PathTraversalGuard.";
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

        // 1. Check risky ObjectCreationExpr: new File(variable), new FileInputStream(variable), etc.
        for (ObjectCreationExpr creation : cu.findAll(ObjectCreationExpr.class)) {
            String typeName = creation.getTypeAsString();
            if (RISKY_TYPES.contains(typeName)) {
                boolean hasDynamicPath = creation.getArguments().stream()
                        .anyMatch(arg -> !(arg instanceof StringLiteralExpr) && !arg.toString().contains("normalize"));

                if (hasDynamicPath) {
                    int startLine = creation.getRange().map(r -> r.begin.line).orElse(1);
                    int endLine = creation.getRange().map(r -> r.end.line).orElse(startLine);
                    String snippet = truncate(creation.toString(), 250);

                    findings.add(new SecurityFindingEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            null,
                            getRuleId(),
                            Severity.HIGH,
                            getCategory(),
                            "Unsafe file path construction via new " + typeName + "() without apparent normalization",
                            getDescription(),
                            getRemediation(),
                            filePath,
                            null,
                            startLine,
                            endLine,
                            snippet,
                            "HIGH",
                            FindingStatus.OPEN
                    ));
                }
            }
        }

        // 2. Check Paths.get(variable) or Path.of(variable)
        for (MethodCallExpr call : cu.findAll(MethodCallExpr.class)) {
            String name = call.getNameAsString();
            if ("get".equals(name) || "of".equals(name)) {
                boolean isPathUtil = call.getScope()
                        .map(s -> "Paths".equals(s.toString()) || "Path".equals(s.toString()))
                        .orElse(false);

                if (isPathUtil) {
                    boolean hasDynamicPath = call.getArguments().stream()
                            .anyMatch(arg -> !(arg instanceof StringLiteralExpr) && !arg.toString().contains("normalize"));

                    if (hasDynamicPath) {
                        int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                        int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);
                        String snippet = truncate(call.toString(), 250);

                        findings.add(new SecurityFindingEntity(
                                UUID.randomUUID(),
                                repositoryId,
                                analysisId,
                                null,
                                getRuleId(),
                                Severity.HIGH,
                                getCategory(),
                                "Unsafe Path resolution via Path." + name + "() with unvalidated path expression",
                                getDescription(),
                                getRemediation(),
                                filePath,
                                null,
                                startLine,
                                endLine,
                                snippet,
                                "HIGH",
                                FindingStatus.OPEN
                        ));
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
