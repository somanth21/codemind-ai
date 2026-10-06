package com.codemind.web.dto;

import java.time.Instant;

public record HealthResponse(
        String status,
        String service,
        String version,
        Instant timestamp
) {
    public static HealthResponse up() {
        return new HealthResponse("UP", "codemind-backend", "0.1.0-SNAPSHOT", Instant.now());
    }
}
