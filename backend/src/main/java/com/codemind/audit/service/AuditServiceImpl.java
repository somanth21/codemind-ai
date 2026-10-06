package com.codemind.audit.service;

import com.codemind.domain.model.AuditLogEntity;
import com.codemind.domain.repository.AuditLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuditServiceImpl implements AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditServiceImpl.class);
    private final AuditLogRepository auditLogRepository;

    public AuditServiceImpl(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logEvent(String principal, String eventType, String status, String ipAddress, String correlationId, String details) {
        try {
            // Guardrail: Ensure details never contains password/token keywords
            String sanitizedDetails = sanitizeAuditDetails(details);

            AuditLogEntity logEntry = new AuditLogEntity(
                    UUID.randomUUID(),
                    principal != null ? principal : "ANONYMOUS",
                    eventType,
                    status,
                    ipAddress,
                    correlationId,
                    sanitizedDetails
            );
            auditLogRepository.save(logEntry);
            log.info("SECURITY AUDIT [{}]: Principal={}, Status={}, IP={}, CorrelationId={}",
                    eventType, principal, status, ipAddress, correlationId);
        } catch (Exception e) {
            log.error("Failed to record audit log: {}", e.getMessage());
        }
    }

    private String sanitizeAuditDetails(String details) {
        if (details == null) {
            return null;
        }
        // Basic sanitizer against accidental token/secret logging
        return details.replaceAll("(?i)(password|secret|token|apiKey)=[^&\\s]+", "$1=[REDACTED]");
    }
}
