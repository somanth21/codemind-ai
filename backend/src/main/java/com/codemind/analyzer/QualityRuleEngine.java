package com.codemind.analyzer;

import com.codemind.domain.model.QualityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.domain.model.SymbolEntity;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.comments.Comment;
import com.github.javaparser.ast.stmt.CatchClause;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class QualityRuleEngine {

    private final MetricsCalculator metricsCalculator;

    public QualityRuleEngine(MetricsCalculator metricsCalculator) {
        this.metricsCalculator = metricsCalculator;
    }

    public List<QualityFindingEntity> analyzeQuality(
            CompilationUnit cu,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            List<SymbolEntity> symbols
    ) {
        List<QualityFindingEntity> findings = new ArrayList<>();
        if (cu == null) {
            return findings;
        }

        // Map FQNs to SymbolEntities for linking symbol IDs
        Map<String, UUID> fqnToId = new HashMap<>();
        for (SymbolEntity s : symbols) {
            if (s.getFqn() != null) {
                fqnToId.put(s.getFqn(), s.getId());
            }
        }

        String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getName().asString())
                .orElse("");

        // 1. Check Classes / Types
        for (TypeDeclaration<?> typeDecl : cu.getTypes()) {
            checkType(typeDecl, packageName, repositoryId, analysisId, filePath, fqnToId, findings);
        }

        // 2. Check Empty Catch Blocks
        for (CatchClause catchClause : cu.findAll(CatchClause.class)) {
            if (catchClause.getBody().getStatements().isEmpty()) {
                int line = catchClause.getRange().map(r -> r.begin.line).orElse(1);
                String paramName = catchClause.getParameter().getNameAsString();
                findings.add(new QualityFindingEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        filePath,
                        null,
                        "EMPTY_CATCH_BLOCK",
                        Severity.HIGH,
                        "Empty catch block",
                        "Catch block for exception '" + paramName + "' contains no statements, suppressing potential failures.",
                        line,
                        "catch (" + catchClause.getParameter().getTypeAsString() + " " + paramName + ") { }"
                ));
            }
        }

        // 3. Check Comments for TODO/FIXME markers
        for (Comment comment : cu.getAllComments()) {
            String content = comment.getContent();
            if (content.contains("TODO") || content.contains("FIXME")) {
                int line = comment.getRange().map(r -> r.begin.line).orElse(1);
                String marker = content.contains("FIXME") ? "FIXME" : "TODO";
                String snippet = content.trim();
                if (snippet.length() > 200) {
                    snippet = snippet.substring(0, 200) + "...";
                }
                findings.add(new QualityFindingEntity(
                        UUID.randomUUID(),
                        repositoryId,
                        analysisId,
                        filePath,
                        null,
                        "TODO_FIXME_MARKER",
                        Severity.INFO,
                        "Unresolved " + marker + " comment",
                        "Source contains unresolved technical debt marker: " + marker,
                        line,
                        snippet
                ));
            }
        }

        return findings;
    }

    private void checkType(
            TypeDeclaration<?> typeDecl,
            String parentFqn,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            Map<String, UUID> fqnToId,
            List<QualityFindingEntity> findings
    ) {
        String simpleName = typeDecl.getNameAsString();
        String typeFqn = parentFqn.isEmpty() ? simpleName : parentFqn + "." + simpleName;
        UUID typeId = fqnToId.get(typeFqn);

        int startLine = typeDecl.getRange().map(r -> r.begin.line).orElse(1);
        int endLine = typeDecl.getRange().map(r -> r.end.line).orElse(startLine);
        int classLoc = Math.max(1, endLine - startLine + 1);

        // Rule: LARGE_CLASS
        if (classLoc > 1000) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    typeId,
                    "LARGE_CLASS",
                    Severity.HIGH,
                    "Excessively large class",
                    "Class '" + simpleName + "' has " + classLoc + " lines of code (threshold: 1000).",
                    startLine,
                    "class " + simpleName + " { ... " + classLoc + " lines ... }"
            ));
        } else if (classLoc > 500) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    typeId,
                    "LARGE_CLASS",
                    Severity.MEDIUM,
                    "Large class",
                    "Class '" + simpleName + "' has " + classLoc + " lines of code (threshold: 500).",
                    startLine,
                    "class " + simpleName + " { ... " + classLoc + " lines ... }"
            ));
        }

        // Check members
        for (BodyDeclaration<?> member : typeDecl.getMembers()) {
            if (member instanceof MethodDeclaration) {
                MethodDeclaration md = (MethodDeclaration) member;
                checkCallable(md, typeFqn, repositoryId, analysisId, filePath, fqnToId, findings);
            } else if (member instanceof ConstructorDeclaration) {
                ConstructorDeclaration cd = (ConstructorDeclaration) member;
                checkCallable(cd, typeFqn, repositoryId, analysisId, filePath, fqnToId, findings);
            } else if (member instanceof TypeDeclaration<?>) {
                checkType((TypeDeclaration<?>) member, typeFqn, repositoryId, analysisId, filePath, fqnToId, findings);
            }
        }
    }

    private void checkCallable(
            CallableDeclaration<?> callable,
            String classFqn,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            Map<String, UUID> fqnToId,
            List<QualityFindingEntity> findings
    ) {
        String name = callable.getNameAsString();
        int paramCount = callable.getParameters().size();
        int startLine = callable.getRange().map(r -> r.begin.line).orElse(1);
        int endLine = callable.getRange().map(r -> r.end.line).orElse(startLine);
        int methodLoc = Math.max(1, endLine - startLine + 1);

        String signature = callable.getDeclarationAsString(false, false, true);
        String callableFqn = classFqn + "." + signature;
        UUID symbolId = fqnToId.get(callableFqn);

        int cc = metricsCalculator.calculateCyclomaticComplexity(callable);
        int depth = metricsCalculator.calculateNestingDepth(callable);

        // Rule: HIGH_CYCLOMATIC_COMPLEXITY
        if (cc > 20) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "HIGH_CYCLOMATIC_COMPLEXITY",
                    Severity.CRITICAL,
                    "Critical cyclomatic complexity",
                    "Method '" + name + "' has cyclomatic complexity of " + cc + " (threshold: 20).",
                    startLine,
                    "complexity = " + cc
            ));
        } else if (cc > 10) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "HIGH_CYCLOMATIC_COMPLEXITY",
                    Severity.MEDIUM,
                    "High cyclomatic complexity",
                    "Method '" + name + "' has cyclomatic complexity of " + cc + " (threshold: 10).",
                    startLine,
                    "complexity = " + cc
            ));
        }

        // Rule: EXCESSIVE_NESTING_DEPTH
        if (depth > 4) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "EXCESSIVE_NESTING_DEPTH",
                    Severity.MEDIUM,
                    "Excessive block nesting depth",
                    "Method '" + name + "' has maximum nesting depth of " + depth + " (threshold: 4).",
                    startLine,
                    "nesting depth = " + depth
            ));
        }

        // Rule: TOO_MANY_PARAMETERS
        if (paramCount > 5) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "TOO_MANY_PARAMETERS",
                    Severity.MEDIUM,
                    "Too many parameters",
                    "Method '" + name + "' accepts " + paramCount + " parameters (threshold: 5).",
                    startLine,
                    signature
            ));
        }

        // Rule: LONG_METHOD
        if (methodLoc > 100) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "LONG_METHOD",
                    Severity.MEDIUM,
                    "Excessively long method",
                    "Method '" + name + "' spans " + methodLoc + " lines (threshold: 100).",
                    startLine,
                    "lines = " + methodLoc
            ));
        } else if (methodLoc > 50) {
            findings.add(new QualityFindingEntity(
                    UUID.randomUUID(),
                    repositoryId,
                    analysisId,
                    filePath,
                    symbolId,
                    "LONG_METHOD",
                    Severity.LOW,
                    "Long method",
                    "Method '" + name + "' spans " + methodLoc + " lines (threshold: 50).",
                    startLine,
                    "lines = " + methodLoc
            ));
        }
    }
}
