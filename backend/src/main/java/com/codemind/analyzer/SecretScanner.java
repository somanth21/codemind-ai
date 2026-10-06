package com.codemind.analyzer;

import com.codemind.domain.model.SecretFindingEntity;
import com.codemind.domain.model.Severity;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SecretScanner {

    private static class SecretRule {
        final String ruleId;
        final Pattern pattern;
        final Severity severity;
        final String confidence;

        SecretRule(String ruleId, String regex, Severity severity, String confidence) {
            this.ruleId = ruleId;
            this.pattern = Pattern.compile(regex);
            this.severity = severity;
            this.confidence = confidence;
        }
    }

    private final List<SecretRule> rules = List.of(
            new SecretRule(
                    "PRIVATE_KEY",
                    "-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
                    Severity.CRITICAL,
                    "CRITICAL"
            ),
            new SecretRule(
                    "AWS_ACCESS_KEY",
                    "\\b(AKIA[0-9A-Z]{16})\\b",
                    Severity.CRITICAL,
                    "HIGH"
            ),
            new SecretRule(
                    "GITHUB_TOKEN",
                    "\\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{40,})\\b",
                    Severity.CRITICAL,
                    "HIGH"
            ),
            new SecretRule(
                    "SLACK_TOKEN",
                    "\\b(xox[baprs]-[0-9a-zA-Z]{10,48})\\b",
                    Severity.HIGH,
                    "HIGH"
            ),
            new SecretRule(
                    "JWT_TOKEN",
                    "\\b(ey[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,})\\b",
                    Severity.HIGH,
                    "HIGH"
            ),
            new SecretRule(
                    "GENERIC_API_KEY",
                    "(?i)(?:api[_-]?key|secret[_-]?key|auth[_-]?token|access[_-]?token)\\s*[:=]\\s*[\"']([a-zA-Z0-9_\\-]{20,})[\"']",
                    Severity.HIGH,
                    "HIGH"
            )
    );

    public List<SecretFindingEntity> scanContent(
            String content,
            UUID repositoryId,
            UUID analysisId,
            String filePath
    ) {
        List<SecretFindingEntity> findings = new ArrayList<>();
        if (content == null || content.isEmpty()) {
            return findings;
        }

        String[] lines = content.split("\r\n|\r|\n", -1);
        for (int i = 0; i < lines.length; i++) {
            String line = lines[i];
            int lineNumber = i + 1;

            for (SecretRule rule : rules) {
                Matcher matcher = rule.pattern.matcher(line);
                if (matcher.find()) {
                    String matchedSecret = matcher.group(0);
                    String redacted = redactSecret(line, matchedSecret);

                    findings.add(new SecretFindingEntity(
                            UUID.randomUUID(),
                            repositoryId,
                            analysisId,
                            filePath,
                            rule.ruleId,
                            rule.severity,
                            rule.confidence,
                            lineNumber,
                            redacted
                    ));
                    // Stop checking additional rules for the same line once matched to avoid noise
                    break;
                }
            }
        }

        return findings;
    }

    public static String redactSecret(String line, String matchedSecret) {
        if (matchedSecret == null || matchedSecret.isEmpty()) {
            return "[REDACTED]";
        }

        String masked;
        if (matchedSecret.startsWith("-----BEGIN")) {
            masked = "-----BEGIN [REDACTED PRIVATE KEY]-----";
        } else if (matchedSecret.length() <= 8) {
            masked = "********";
        } else {
            String prefix = matchedSecret.substring(0, Math.min(4, matchedSecret.length()));
            String suffix = matchedSecret.substring(Math.max(0, matchedSecret.length() - 2));
            masked = prefix + "*".repeat(Math.max(4, matchedSecret.length() - prefix.length() - suffix.length())) + suffix;
        }

        String redactedLine = line.replace(matchedSecret, masked).trim();
        if (redactedLine.length() > 250) {
            redactedLine = redactedLine.substring(0, 250) + "...";
        }
        return redactedLine;
    }
}
