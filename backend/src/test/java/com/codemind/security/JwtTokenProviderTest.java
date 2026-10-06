package com.codemind.security;

import com.codemind.domain.model.Role;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    private JwtTokenProvider tokenProvider;
    private static final String TEST_SECRET = "01234567890123456789012345678901_32_chars_min_length";

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(TEST_SECRET, 900000, 604800000);
    }

    @Test
    void testGenerateAndValidateToken() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(userId, "architect@codemind.ai", "hashed", Role.ROLE_DEVELOPER, true);

        String token = tokenProvider.generateAccessToken(principal);

        assertNotNull(token);
        assertTrue(tokenProvider.validateToken(token));
        assertEquals("architect@codemind.ai", tokenProvider.getEmailFromToken(token));
        assertEquals(userId, tokenProvider.getUserIdFromToken(token));
        assertEquals(Role.ROLE_DEVELOPER, tokenProvider.getRoleFromToken(token));
    }

    @Test
    void testRejectsTamperedToken() {
        UUID userId = UUID.randomUUID();
        UserPrincipal principal = new UserPrincipal(userId, "architect@codemind.ai", "hashed", Role.ROLE_DEVELOPER, true);

        String token = tokenProvider.generateAccessToken(principal);
        String tamperedToken = token + "xyz";

        assertFalse(tokenProvider.validateToken(tamperedToken));
    }

    @Test
    void testRejectsWeakSecretKey() {
        assertThrows(IllegalArgumentException.class, () -> new JwtTokenProvider("short-secret", 900000, 604800000));
    }
}
