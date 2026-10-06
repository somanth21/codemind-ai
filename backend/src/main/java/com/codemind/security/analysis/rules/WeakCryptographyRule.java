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
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Component
public class WeakCryptographyRule implements SecurityRule {

    private static final Set<String> WEAK_HASHES = Set.of("MD5", "MD2", "SHA-1", "SHA1", "SHA");
    private static final Set<String> WEAK_CIPHERS = Set.of("DES", "DESEDE", "TRIPLEDES", "RC2", "RC4", "BLOWFISH");

    @Override
    public String getRuleId() {
        return "SEC_WEAK_CRYPTOGRAPHY";
    }

    @Override
    public SecurityCategory getCategory() {
        return SecurityCategory.CRYPTOGRAPHY;
    }

    @Override
    public Severity getSeverity() {
        return Severity.MEDIUM;
    }

    @Override
    public String getDescription() {
        return "Detects use of broken or deprecated cryptographic algorithms (MD5, SHA-1, DES, ECB cipher mode) or predictable pseudo-random number generators in security contexts.";
    }

    @Override
    public String getRemediation() {
        return "Upgrade hashing to SHA-256 or SHA-512. Use AES-GCM (AES/GCM/NoPadding) for encryption. Replace java.util.Random with java.security.SecureRandom for security tokens and keys.";
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

        // 1. MessageDigest and Cipher getInstance calls
        for (MethodCallExpr call : cu.findAll(MethodCallExpr.class)) {
            if ("getInstance".equals(call.getNameAsString()) && !call.getArguments().isEmpty()) {
                Expression firstArg = call.getArguments().get(0);
                if (firstArg instanceof StringLiteralExpr strLit) {
                    String algo = strLit.getValue().trim();
                    String upperAlgo = algo.toUpperCase(Locale.ROOT);

                    // Check weak hashes
                    if (WEAK_HASHES.contains(upperAlgo)) {
                        int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                        int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);
                        findings.add(new SecurityFindingEntity(
                                UUID.randomUUID(),
                                repositoryId,
                                analysisId,
                                null,
                                "SEC_WEAK_HASH_" + upperAlgo.replace("-", ""),
                                Severity.MEDIUM,
                                getCategory(),
                                "Weak cryptographic hash algorithm detected: " + algo,
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

                    // Check weak ciphers or ECB mode
                    boolean isWeakCipher = WEAK_CIPHERS.stream().anyMatch(upperAlgo::startsWith);
                    boolean isEcbMode = upperAlgo.contains("/ECB/") || upperAlgo.endsWith("/ECB") || upperAlgo.equals("ECB");

                    if (isWeakCipher || isEcbMode) {
                        int startLine = call.getRange().map(r -> r.begin.line).orElse(1);
                        int endLine = call.getRange().map(r -> r.end.line).orElse(startLine);
                        findings.add(new SecurityFindingEntity(
                                UUID.randomUUID(),
                                repositoryId,
                                analysisId,
                                null,
                                isEcbMode ? "SEC_INSECURE_CIPHER_MODE_ECB" : "SEC_WEAK_CIPHER_" + upperAlgo,
                                Severity.HIGH,
                                getCategory(),
                                isEcbMode
                                        ? "Insecure ECB cipher mode detected: " + algo
                                        : "Broken or deprecated cipher algorithm detected: " + algo,
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

        // 2. new java.util.Random() used in security contexts
        for (ObjectCreationExpr creation : cu.findAll(ObjectCreationExpr.class)) {
            String type = creation.getTypeAsString();
            if ("Random".equals(type) || "java.util.Random".equals(type)) {
                // Check if variable or enclosing method/field has security name
                String contextStr = creation.getParentNode().map(Object::toString).orElse("").toLowerCase(Locale.ROOT);
                boolean inSecContext = contextStr.contains("token") || contextStr.contains("key")
                        || contextStr.contains("secret") || contextStr.contains("password")
                        || contextStr.contains("salt") || contextStr.contains("nonce");

                if (inSecContext) {
                    int startLine = creation.getRange().map(r -> r.begin.line).orElse(1);
                    int endLine = creation.getRange().map(r -> r.end.line).orElse(startLine);
                    findings.add(new SecurityFindingEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            null,
                            "SEC_PREDICTABLE_RANDOM_GENERATOR",
                            Severity.MEDIUM,
                            getCategory(),
                            "Use of predictable java.util.Random() for security-sensitive token/key generation",
                            getDescription(),
                            "Replace java.util.Random with java.security.SecureRandom for cryptographic key, token, or nonce generation.",
                            filePath,
                            null,
                            startLine,
                            endLine,
                            truncate(creation.toString(), 250),
                            "HIGH",
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
