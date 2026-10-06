package com.codemind.domain.repository;

import com.codemind.domain.model.AuditLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLogEntity, UUID> {
    List<AuditLogEntity> findByPrincipalOrderByTimestampDesc(String principal);
    List<AuditLogEntity> findByEventTypeOrderByTimestampDesc(String eventType);
}
