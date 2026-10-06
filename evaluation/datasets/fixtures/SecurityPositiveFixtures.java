package com.codemind.fixtures;

import java.io.*;
import java.security.*;
import javax.crypto.*;
import java.sql.*;

/**
 * True Positive Security Benchmark Fixtures.
 * Contains intentional synthetic vulnerabilities targeting the 8 CodeMind deterministic security rules.
 */
public class SecurityPositiveFixtures {

    // Rule: SEC-SECRET-001 (Hardcoded Credentials)
    private static final String AWS_SECRET = "AKIAIOSFODNN7EXAMPLE";
    private static final String GITHUB_TOKEN = "ghp_1234567890abcdefghijklmnopqrstuvwxyzAB";

    // Rule: SEC-CMD-001 (Command Injection)
    public void runCommand(String userInput) throws IOException {
        Runtime.getRuntime().exec("sh -c " + userInput);
    }

    public void runProcess(String arg) throws IOException {
        ProcessBuilder pb = new ProcessBuilder("bash", "-c", arg);
        pb.start();
    }

    // Rule: SEC-PATH-001 (Path Traversal)
    public File getFile(String userPath) {
        return new File("/var/data/uploads/" + userPath);
    }

    // Rule: SEC-CRYPTO-001 (Broken Cryptography)
    public byte[] hashMd5(byte[] data) throws NoSuchAlgorithmException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        return md.digest(data);
    }

    public Cipher getDesCipher() throws NoSuchAlgorithmException, NoSuchPaddingException {
        return Cipher.getInstance("DES");
    }

    // Rule: SEC-SQL-001 (SQL Injection)
    public void queryUser(Connection conn, String username) throws SQLException {
        Statement stmt = conn.createStatement();
        String sql = "SELECT * FROM users WHERE username = '" + username + "'";
        stmt.executeQuery(sql);
    }

    // Rule: SEC-DESER-001 (Unsafe Deserialization)
    public Object deserializeData(InputStream stream) throws IOException, ClassNotFoundException {
        ObjectInputStream ois = new ObjectInputStream(stream);
        return ois.readObject();
    }

    // Rule: SEC-AUTH-001 (Broken Authentication / Hardcoded Bypass)
    public boolean checkAuth(String username, String password) {
        if ("admin".equals(username) && "admin123".equals(password)) {
            return true;
        }
        return false;
    }

    // Rule: SEC-LOG-001 (Sensitive Logging)
    public void logCredentials(String user, String rawPassword, String apiKey) {
        System.out.println("User: " + user + " Password: " + rawPassword + " ApiKey: " + apiKey);
    }
}
