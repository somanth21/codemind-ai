package com.codemind.audit.service;

import java.util.UUID;

public interface AuditService {
    void logEvent(String principal, String eventType, String status, String ipAddress, String correlationId, String details);
}
