package com.codemind.web.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresInMs,
        UserDto user
) {
    public static AuthResponse bearer(String token, long expiresInMs, UserDto user) {
        return new AuthResponse(token, "Bearer", expiresInMs, user);
    }
}
