package com.codemind.admin.service;

import com.codemind.domain.model.Role;
import com.codemind.web.dto.admin.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface AdminService {
    AdminOverviewDto getOverview();
    Page<UserAdminDto> getUsers(Pageable pageable, String search);
    UserAdminDto updateUserRole(UUID userId, Role newRole, String adminPrincipal, String ipAddress);
    UserAdminDto updateUserStatus(UUID userId, boolean active, String adminPrincipal, String ipAddress);
    Page<RepositoryAdminDto> getRepositories(Pageable pageable);
    SecurityAdminOverviewDto getSecurityOverview();
    Page<AuditAdminDto> getAuditLogs(Pageable pageable, String eventType, String principal);
    AiTelemetryDto getAiTelemetry();
    SystemHealthDto getSystemHealth();
}