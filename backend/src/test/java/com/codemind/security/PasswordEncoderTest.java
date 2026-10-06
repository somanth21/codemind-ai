package com.codemind.security;

import com.codemind.security.service.PasswordEncoderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PasswordEncoderTest {

    private PasswordEncoderService passwordEncoderService;

    @BeforeEach
    void setUp() {
        passwordEncoderService = new PasswordEncoderService();
    }

    @Test
    void testEncodeGeneratesNonReversibleHash() {
        String raw = "StrongSecret123!";
        String encoded = passwordEncoderService.encode(raw);

        assertNotNull(encoded);
        assertNotEquals(raw, encoded);
        assertTrue(encoded.startsWith("$2a$12$") || encoded.startsWith("$2b$12$"), "Should use BCrypt work factor 12");
    }

    @Test
    void testMatchesValidPassword() {
        String raw = "DevSecure123!";
        String encoded = passwordEncoderService.encode(raw);

        assertTrue(passwordEncoderService.matches(raw, encoded));
        assertFalse(passwordEncoderService.matches("WrongPassword", encoded));
    }

    @Test
    void testSaltingProducesDifferentHashes() {
        String raw = "SameSecretString";
        String hash1 = passwordEncoderService.encode(raw);
        String hash2 = passwordEncoderService.encode(raw);

        assertNotEquals(hash1, hash2, "Unique salt per hash must produce distinct outputs");
        assertTrue(passwordEncoderService.matches(raw, hash1));
        assertTrue(passwordEncoderService.matches(raw, hash2));
    }

    @Test
    void testRejectsNullOrBlankRawPassword() {
        assertThrows(IllegalArgumentException.class, () -> passwordEncoderService.encode(null));
        assertThrows(IllegalArgumentException.class, () -> passwordEncoderService.encode(""));
    }
}
