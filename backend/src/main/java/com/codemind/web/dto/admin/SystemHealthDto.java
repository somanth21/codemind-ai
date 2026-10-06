package com.codemind.web.dto.admin;

import java.time.Instant;

public record SystemHealthDto(
        String status,
        String databaseStatus,
        long databaseLatencyMs,
        long uptimeSeconds,
        long totalMemoryBytes,
        long freeMemoryBytes,
        int activeCores,
        Instant timestamp
) {}