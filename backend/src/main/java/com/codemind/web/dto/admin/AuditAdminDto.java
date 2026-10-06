package com.codemind.web.dto.admin;

import java.time.Instant;
import java.util.UUID;

public record AuditAdminDto(
        UUID id,
        String principal,
        String eventType,
        String outcome,
        String ipAddress,
        String correlationId,
        String details,
        Instant timestamp
) {}