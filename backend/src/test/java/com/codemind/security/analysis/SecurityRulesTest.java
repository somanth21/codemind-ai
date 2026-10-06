package com.codemind.security.analysis;

import com.codemind.analyzer.SecretScanner;
import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.security.analysis.rules.*;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class SecurityRulesTest {

    private final UUID repoId = UUID.randomUUID();
    private final UUID runId = UUID.randomUUID();

    @Test
    @DisplayName("CommandExecutionRule detects Runtime.exec and ProcessBuilder")
    void testCommandExecutionRule() {
        CommandExecutionRule rule = new CommandExecutionRule();

        String vulnerableCode = """
                package com.example;
                public class ShellService {
                    public void runUserCmd(String cmd) throws Exception {
                        Runtime.getRuntime().exec(cmd);
                        new ProcessBuilder(cmd).start();
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(vulnerableCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/ShellService.java", repoId, runId, Collections.emptyMap(), vulnerableCode);

        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getSeverity() == Severity.HIGH));
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.INJECTION));
        assertTrue(findings.get(0).getMessage().contains("Runtime.exec"));
        assertTrue(findings.get(1).getMessage().contains("ProcessBuilder"));

        // Clean code test
        String safeCode = """
                package com.example;
                public class SafeService {
                    public void run() {
                        System.out.println("No commands executed");
                    }
                }
                """;
        CompilationUnit safeCu = StaticJavaParser.parse(safeCode);
        List<SecurityFindingEntity> safeFindings = rule.analyze(safeCu, "com/example/SafeService.java", repoId, runId, Collections.emptyMap(), safeCode);
        assertTrue(safeFindings.isEmpty());
    }

    @Test
    @DisplayName("PathTraversalRule detects unvalidated file access operations")
    void testPathTraversalRule() {
        PathTraversalRule rule = new PathTraversalRule();

        String vulnerableCode = """
                package com.example;
                import java.io.File;
                import java.io.FileInputStream;
                import java.nio.file.Paths;
                public class FileDownloader {
                    public void download(String userPath) throws Exception {
                        File f = new File(userPath);
                        FileInputStream fis = new FileInputStream(userPath);
                        Paths.get(userPath);
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(vulnerableCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/FileDownloader.java", repoId, runId, Collections.emptyMap(), vulnerableCode);

        assertEquals(3, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.FILE_ACCESS));

        // Clean code test
        String safeCode = """
                package com.example;
                public class FileDownloaderSafe {
                    public void download() {
                        String name = "constant_safe.txt";
                    }
                }
                """;
        CompilationUnit safeCu = StaticJavaParser.parse(safeCode);
        List<SecurityFindingEntity> safeFindings = rule.analyze(safeCu, "com/example/FileDownloaderSafe.java", repoId, runId, Collections.emptyMap(), safeCode);
        assertTrue(safeFindings.isEmpty());
    }

    @Test
    @DisplayName("WeakCryptographyRule detects MD5, SHA-1, DES, and java.util.Random")
    void testWeakCryptographyRule() {
        WeakCryptographyRule rule = new WeakCryptographyRule();

        String vulnerableCode = """
                package com.example;
                import java.security.MessageDigest;
                import java.util.Random;
                import javax.crypto.Cipher;
                public class CryptoService {
                    public void test() throws Exception {
                        MessageDigest md5 = MessageDigest.getInstance("MD5");
                        MessageDigest sha1 = MessageDigest.getInstance("SHA-1");
                        Cipher des = Cipher.getInstance("DES/ECB/PKCS5Padding");
                        Random tokenGen = new Random();
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(vulnerableCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/CryptoService.java", repoId, runId, Collections.emptyMap(), vulnerableCode);

        assertEquals(4, findings.size());
        assertTrue(findings.stream().anyMatch(f -> f.getMessage().contains("MD5")));
        assertTrue(findings.stream().anyMatch(f -> f.getMessage().contains("SHA-1")));
        assertTrue(findings.stream().anyMatch(f -> f.getMessage().contains("DES/ECB")));
        assertTrue(findings.stream().anyMatch(f -> f.getMessage().contains("java.util.Random")));

        // Secure code test: SHA-256 and SecureRandom
        String safeCode = """
                package com.example;
                import java.security.MessageDigest;
                import java.security.SecureRandom;
                public class SecureCryptoService {
                    public void test() throws Exception {
                        MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
                        SecureRandom sr = new SecureRandom();
                    }
                }
                """;
        CompilationUnit safeCu = StaticJavaParser.parse(safeCode);
        List<SecurityFindingEntity> safeFindings = rule.analyze(safeCu, "com/example/SecureCryptoService.java", repoId, runId, Collections.emptyMap(), safeCode);
        assertTrue(safeFindings.isEmpty());
    }

    @Test
    @DisplayName("SqlInjectionRule detects dynamic string concatenation and allows parameterized queries")
    void testSqlInjectionRule() {
        SqlInjectionRule rule = new SqlInjectionRule();

        String vulnerableCode = """
                package com.example;
                import java.sql.Statement;
                import jakarta.persistence.EntityManager;
                public class UserDao {
                    public void query(Statement stmt, EntityManager em, String input) throws Exception {
                        stmt.executeQuery("SELECT * FROM users WHERE name = '" + input + "'");
                        em.createQuery("SELECT u FROM User u WHERE u.name = " + input);
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(vulnerableCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/UserDao.java", repoId, runId, Collections.emptyMap(), vulnerableCode);

        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getSeverity() == Severity.HIGH));
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.INJECTION));

        // Parameterized queries test
        String safeCode = """
                package com.example;
                import java.sql.PreparedStatement;
                import jakarta.persistence.EntityManager;
                public class SafeUserDao {
                    public void query(PreparedStatement stmt, EntityManager em, String input) throws Exception {
                        em.createQuery("SELECT u FROM User u WHERE u.name = :name").setParameter("name", input);
                    }
                }
                """;
        CompilationUnit safeCu = StaticJavaParser.parse(safeCode);
        List<SecurityFindingEntity> safeFindings = rule.analyze(safeCu, "com/example/SafeUserDao.java", repoId, runId, Collections.emptyMap(), safeCode);
        assertTrue(safeFindings.isEmpty());
    }

    @Test
    @DisplayName("UnsafeDeserializationRule detects ObjectInputStream and XMLDecoder")
    void testUnsafeDeserializationRule() {
        UnsafeDeserializationRule rule = new UnsafeDeserializationRule();

        String vulnerableCode = """
                package com.example;
                import java.io.ObjectInputStream;
                import java.beans.XMLDecoder;
                public class SerialService {
                    public Object read(ObjectInputStream ois, XMLDecoder decoder) throws Exception {
                        decoder.readObject();
                        return ois.readObject();
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(vulnerableCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/SerialService.java", repoId, runId, Collections.emptyMap(), vulnerableCode);

        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getSeverity() == Severity.HIGH));
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.DESERIALIZATION));
    }

    @Test
    @DisplayName("MissingEndpointAuthRule detects endpoints without authorization")
    void testMissingEndpointAuthRule() {
        MissingEndpointAuthRule rule = new MissingEndpointAuthRule();

        String controllerCode = """
                package com.example;
                import org.springframework.web.bind.annotation.RestController;
                import org.springframework.web.bind.annotation.GetMapping;
                import org.springframework.security.access.prepost.PreAuthorize;
                @RestController
                public class AdminController {
                    @GetMapping("/public")
                    public String publicEndpoint() {
                        return "ok";
                    }

                    @PreAuthorize("hasRole('ADMIN')")
                    @GetMapping("/secure")
                    public String secureEndpoint() {
                        return "admin";
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(controllerCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/AdminController.java", repoId, runId, Collections.emptyMap(), controllerCode);

        // One method missing auth annotation, one method secured with @PreAuthorize
        assertEquals(1, findings.size());
        assertEquals("publicEndpoint", findings.get(0).getMessage().replaceAll(".*'(\\w+)'.*", "$1"));
        assertEquals(Severity.LOW, findings.get(0).getSeverity());
    }

    @Test
    @DisplayName("SensitiveLoggingRule detects logging of secrets and passwords")
    void testSensitiveLoggingRule() {
        SensitiveLoggingRule rule = new SensitiveLoggingRule();

        String loggingCode = """
                package com.example;
                import org.slf4j.Logger;
                import org.slf4j.LoggerFactory;
                public class AuthService {
                    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
                    public void authenticate(String password, String secretToken) {
                        log.info("User logged in with password: " + password);
                        log.debug("Token is: " + secretToken);
                    }
                }
                """;

        CompilationUnit cu = StaticJavaParser.parse(loggingCode);
        List<SecurityFindingEntity> findings = rule.analyze(cu, "com/example/AuthService.java", repoId, runId, Collections.emptyMap(), loggingCode);

        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.ERROR_HANDLING));
    }

    @Test
    @DisplayName("HardcodedSecretsRule detects secrets and redacts them")
    void testHardcodedSecretsRule() {
        HardcodedSecretsRule rule = new HardcodedSecretsRule(new SecretScanner());

        String secretCode = """
                package com.example;
                public class Config {
                    private String aws = "AKIA1234567890ABCDEF";
                    private String git = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
                }
                """;

        List<SecurityFindingEntity> findings = rule.analyze(null, "com/example/Config.java", repoId, runId, Collections.emptyMap(), secretCode);

        assertEquals(2, findings.size());
        assertTrue(findings.stream().allMatch(f -> f.getCategory() == SecurityCategory.SECRETS));
        // Verify redacted snippet
        assertTrue(findings.get(0).getEvidenceSnippet().contains("AKIA"));
        assertTrue(findings.get(0).getEvidenceSnippet().contains("****"));
        assertFalse(findings.get(0).getEvidenceSnippet().contains("AKIA1234567890ABCDEF"));
    }
}
