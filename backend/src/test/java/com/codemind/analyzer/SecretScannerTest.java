package com.codemind.analyzer;

import com.codemind.domain.model.SecretFindingEntity;
import com.codemind.domain.model.Severity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SecretScannerTest {

    private SecretScanner secretScanner;

    @BeforeEach
    void setUp() {
        secretScanner = new SecretScanner();
    }

    @Test
    void scanContent_detectsSecretsAndRedactsPlaintext() {
        String content = """
                # Configuration
                AWS_KEY=AKIA1234567890ABCDEF
                GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyz1234567890
                API_KEY="secret_token_1234567890abcdef123456"
                """;
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        List<SecretFindingEntity> findings = secretScanner.scanContent(content, repoId, runId, "config.properties");

        assertThat(findings).hasSize(3);

        // Verify AWS Key
        SecretFindingEntity aws = findings.stream().filter(f -> "AWS_ACCESS_KEY".equals(f.getRuleId())).findFirst().orElseThrow();
        assertThat(aws.getSeverity()).isEqualTo(Severity.CRITICAL);
        // STRICT REDACTION VERIFICATION: Plaintext secret must never appear in redactedEvidence
        assertThat(aws.getRedactedEvidence()).doesNotContain("AKIA1234567890ABCDEF");
        assertThat(aws.getRedactedEvidence()).contains("****");

        // Verify GitHub token
        SecretFindingEntity gh = findings.stream().filter(f -> "GITHUB_TOKEN".equals(f.getRuleId())).findFirst().orElseThrow();
        assertThat(gh.getRedactedEvidence()).doesNotContain("ghp_abcdefghijklmnopqrstuvwxyz1234567890");
        assertThat(gh.getRedactedEvidence()).contains("****");
    }

    @Test
    void scanContent_privateKeyDetection() {
        String content = """
                -----BEGIN RSA PRIVATE KEY-----
                MIIEowIBAAKCAQEA0...
                -----END RSA PRIVATE KEY-----
                """;
        List<SecretFindingEntity> findings = secretScanner.scanContent(content, UUID.randomUUID(), UUID.randomUUID(), "server.key");
        assertThat(findings).isNotEmpty();
        assertThat(findings.get(0).getRuleId()).isEqualTo("PRIVATE_KEY");
        assertThat(findings.get(0).getSeverity()).isEqualTo(Severity.CRITICAL);
    }
}
