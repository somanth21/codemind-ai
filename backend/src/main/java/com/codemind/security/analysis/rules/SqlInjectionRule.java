package com.codemind.security.analysis.rules;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.BinaryExpr;
import com.github.javaparser.ast.expr.Expression;
import com.github.javaparser.ast.expr.MethodCallExpr;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class SqlInjectionRule implements SecurityRule {

    private static final Set<String> SQL_METHODS = Set.of(
            "executeQuery", "execute", "executeUpdate",
            "createQuery", "createNativeQuery"
    );

    @Override
    public String getRuleId() {
        return "SEC_SQL_INJECTION";
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
        return "Detects dynamic SQL query construction using string concatenation or unparameterized formatting, which exposes the application to SQL injection attacks.";
    }

    @Override
    public String getRemediation() {
        return "Use parameterized queries or prepared statements with positional '?' or named ':param' placeholders. Never concatenate user-supplied input directly into SQL commands.";
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
            if (SQL_METHODS.contains(methodName) && !call.getArguments().isEmpty()) {
                Expression queryArg = call.getArguments().get(0);

                boolean isConcat = queryArg instanceof BinaryExpr bin && bin.getOperator() == BinaryExpr.Operator.PLUS;
                boolean isStringFormat = queryArg instanceof MethodCallExpr m && "format".equals(m.getNameAsString());

                if (isConcat || isStringFormat) {
                    // Check if query looks like SQL statement
                    String queryText = queryArg.toString().toUpperCase();
                    boolean containsSqlKeywords = queryText.contains("SELECT") || queryText.contains("INSERT")
                            || queryText.contains("UPDATE") || queryText.contains("DELETE")
                            || queryText.contains("FROM") || queryText.contains("WHERE");

                    if (containsSqlKeywords || "createNativeQuery".equals(methodName) || "createQuery".equals(methodName)) {
                        int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                        int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);

                        findings.add(new SecurityFindingEntity(
                                UUID.randomUUID(),
                                repositoryId,
                                analysisId,
                                null,
                                getRuleId(),
                                Severity.HIGH,
                                getCategory(),
                                "Potential SQL injection: dynamic string concatenation in " + methodName + "()",
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
