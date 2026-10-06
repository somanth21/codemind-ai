package com.codemind.security.analysis.rules;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import com.github.javaparser.ast.body.MethodDeclaration;
import com.github.javaparser.ast.expr.AnnotationExpr;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class MissingEndpointAuthRule implements SecurityRule {

    private static final Set<String> ENDPOINT_ANNOTATIONS = Set.of(
            "GetMapping", "PostMapping", "PutMapping", "DeleteMapping", "PatchMapping", "RequestMapping"
    );

    private static final Set<String> AUTH_ANNOTATIONS = Set.of(
            "PreAuthorize", "Secured", "RolesAllowed", "PermitAll", "DenyAll"
    );

    @Override
    public String getRuleId() {
        return "SEC_ENDPOINT_MISSING_AUTH";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.AUTHORIZATION;
    }

    @Override
    public Severity getSeverity() {
        return Severity.LOW;
    }

    @Override
    public String getDescription() {
        return "Detects web controller endpoints that lack explicit method- or class-level security annotations (@PreAuthorize, @Secured, @RolesAllowed), which may indicate inadvertent public exposure.";
    }

    @Override
    public String getRemediation() {
        return "Verify whether this endpoint is intentionally public. If restricted, annotate the method or controller with @PreAuthorize(\"hasRole('...')\") or configure explicit path authorization in SecurityFilterChain.";
    }

    @Override
    public String getConfidence() {
        return "MEDIUM";
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

        for (ClassOrInterfaceDeclaration type : cu.findAll(ClassOrInterfaceDeclaration.class)) {
            boolean isController = type.getAnnotations().stream()
                    .anyMatch(a -> a.getNameAsString().equals("RestController") || a.getNameAsString().equals("Controller"));

            if (!isController) {
                continue;
            }

            boolean classHasAuth = type.getAnnotations().stream()
                    .anyMatch(a -> AUTH_ANNOTATIONS.contains(a.getNameAsString()));

            if (classHasAuth) {
                continue; // Class-level auth covers all methods
            }

            for (MethodDeclaration method : type.getMethods()) {
                boolean isEndpoint = method.getAnnotations().stream()
                        .anyMatch(a -> ENDPOINT_ANNOTATIONS.contains(a.getNameAsString()));

                if (!isEndpoint) {
                    continue;
                }

                boolean methodHasAuth = method.getAnnotations().stream()
                        .anyMatch(a -> AUTH_ANNOTATIONS.contains(a.getNameAsString()));

                if (!methodHasAuth) {
                    int startLine = method.getRange().map(r -> r.begin.line).orElse(1);
                    int endLine = method.getRange().map(r -> r.end.line).orElse(startLine);

                    findings.add(new SecurityFindingEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            null,
                            getRuleId(),
                            Severity.LOW,
                            getCategory(),
                            "Controller endpoint '" + method.getNameAsString() + "' lacks explicit authorization annotation",
                            getDescription(),
                            getRemediation(),
                            filePath,
                            null,
                            startLine,
                            endLine,
                            truncate(method.getDeclarationAsString(), 250),
                            "MEDIUM",
                            FindingStatus.OPEN
                    ));
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
