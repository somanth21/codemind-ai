package com.codemind.security.analysis.rules;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.SecurityRule;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.expr.MethodCallExpr;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class UnsafeDeserializationRule implements SecurityRule {

    @Override
    public String getRuleId() {
        return "SEC_UNSAFE_DESERIALIZATION";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.DESERIALIZATION;
    }

    @Override
    public Severity getSeverity() {
        return Severity.HIGH;
    }

    @Override
    public String getDescription() {
        return "Detects standard Java object deserialization via ObjectInputStream.readObject() or XMLDecoder.readObject(), which can lead to remote code execution if untrusted bytecode streams are processed.";
    }

    @Override
    public String getRemediation() {
        return "Avoid standard Java serialization. Prefer safe text formats like JSON with Jackson/Gson. If binary serialization is unavoidable, enforce ObjectInputFilter with a strict class allowlist.";
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
            String name = call.getNameAsString();
            if ("readObject".equals(name) || "readUnshared".equals(name)) {
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
                        "Unsafe Java object deserialization invocation via " + name + "()",
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

        return findings;
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
