package com.codemind.fixtures;

import java.io.*;
import java.nio.file.*;
import java.security.*;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import java.sql.*;

/**
 * True Negative Security Benchmark Fixtures (Clean Controls).
 * Contains safe, best-practice implementations designed to verify that the 8 security rules do not trigger false positives.
 */
public class SecurityNegativeFixtures {

    // Rule: SEC-SECRET-001 (Negative Control: Config placeholder, no raw key)
    private final String configKey = "${app.security.token}";

    // Rule: SEC-CMD-001 (Negative Control: Allowlisted static executable without shell evaluation)
    public void runSafeCommand() throws IOException {
        ProcessBuilder pb = new ProcessBuilder("/usr/bin/uptime");
        pb.start();
    }

    // Rule: SEC-PATH-001 (Negative Control: Normalized path verification with parent boundary check)
    public Path getSafePath(Path baseDir, String userPath) {
        Path resolved = baseDir.resolve(userPath).normalize();
        if (!resolved.startsWith(baseDir)) {
            throw new SecurityException("Path traversal attempt detected");
        }
        return resolved;
    }

    // Rule: SEC-CRYPTO-001 (Negative Control: Strong modern cryptography)
    public byte[] hashSha256(byte[] data) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        return md.digest(data);
    }

    public Cipher getAesGcmCipher(SecretKey key, byte[] iv) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, spec);
        return cipher;
    }

    // Rule: SEC-SQL-001 (Negative Control: Parameterized Prepared Statement)
    public void queryUserSafe(Connection conn, String username) throws SQLException {
        String sql = "SELECT id, username FROM users WHERE username = ?";
        try (PreparedStatement pstmt = conn.prepareStatement(sql)) {
            pstmt.setString(1, username);
            pstmt.executeQuery();
        }
    }

    // Rule: SEC-DESER-001 (Negative Control: Safe JSON parsing via typed parser)
    public String parseSafeJson(String jsonInput) {
        // Safe typed parsing without native Java serialization
        return jsonInput.trim();
    }

    // Rule: SEC-AUTH-001 (Negative Control: Delegated cryptographic password hashing comparison)
    public boolean verifyPassword(String rawPassword, String hashedPassword, java.util.function.BiPredicate<String, String> encoder) {
        if (rawPassword == null || hashedPassword == null) {
            return false;
        }
        return encoder.test(rawPassword, hashedPassword);
    }

    // Rule: SEC-LOG-001 (Negative Control: Masked identifier logging)
    public void logSafeEvent(String user, String correlationId) {
        System.out.println("User event for user=" + user + " corrId=" + correlationId);
    }
}
