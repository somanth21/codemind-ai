package com.codemind.admin.service.impl;

import com.codemind.admin.service.AdminService;
import com.codemind.audit.service.AuditService;
import com.codemind.domain.model.AuditLogEntity;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.*;
import com.codemind.web.dto.admin.*;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.sql.Connection;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final RepositoryEntityRepository repositoryEntityRepository;
    private final AnalysisRunRepository analysisRunRepository;
    private final SecurityFindingRepository securityFindingRepository;
    private final AuditLogRepository auditLogRepository;
    private final AiReasoningRequestRepository aiReasoningRequestRepository;
    private final AuditService auditService;
    private final DataSource dataSource;

    public AdminServiceImpl(
            UserRepository userRepository,
            RepositoryEntityRepository repositoryEntityRepository,
            AnalysisRunRepository analysisRunRepository,
            SecurityFindingRepository securityFindingRepository,
            AuditLogRepository auditLogRepository,
            AiReasoningRequestRepository aiReasoningRequestRepository,
            AuditService auditService,
            DataSource dataSource
    ) {
        this.userRepository = userRepository;
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.analysisRunRepository = analysisRunRepository;
        this.securityFindingRepository = securityFindingRepository;
        this.auditLogRepository = auditLogRepository;
        this.aiReasoningRequestRepository = aiReasoningRequestRepository;
        this.auditService = auditService;
        this.dataSource = dataSource;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminOverviewDto getOverview() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.findAll().stream().filter(UserEntity::isActive).count();
        long totalRepos = repositoryEntityRepository.count();
        long totalAnalyses = analysisRunRepository.count();
        long totalFindings = securityFindingRepository.count();
        long totalAuditEvents = auditLogRepository.count();

        return new AdminOverviewDto(
                totalUsers,
                activeUsers,
                totalRepos,
                totalAnalyses,
                totalFindings,
                totalAuditEvents
        );
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserAdminDto> getUsers(Pageable pageable, String search) {
        Page<UserEntity> page = userRepository.findAll(pageable);
        List<UserAdminDto> dtos = page.getContent().stream()
                .filter(u -> search == null || search.isBlank() || u.getEmail().toLowerCase().contains(search.toLowerCase().trim()))
                .map(u -> {
                    long repoCount = repositoryEntityRepository.findByOwnerId(u.getId()).size();
                    return UserAdminDto.fromEntity(u, repoCount);
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Override
    @Transactional
    public UserAdminDto updateUserRole(UUID userId, Role newRole, String adminPrincipal, String ipAddress) {
        String correlationId = MDC.get("correlationId");
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // Safety: If demoting an admin, ensure there is at least one other active admin
        if (user.getRole() == Role.ROLE_ADMIN && newRole != Role.ROLE_ADMIN) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN && u.isActive() && !u.getId().equals(userId))
                    .count();
            if (adminCount == 0) {
                throw new IllegalStateException("Cannot demote the last remaining active administrator");
            }
        }

        Role oldRole = user.getRole();
        user.setRole(newRole);
        UserEntity saved = userRepository.save(user);

        auditService.logEvent(
                adminPrincipal,
                "USER_ROLE_UPDATED",
                "SUCCESS",
                ipAddress,
                correlationId,
                String.format("Updated role of user %s from %s to %s", user.getEmail(), oldRole, newRole)
        );

        long repoCount = repositoryEntityRepository.findByOwnerId(saved.getId()).size();
        return UserAdminDto.fromEntity(saved, repoCount);
    }

    @Override
    @Transactional
    public UserAdminDto updateUserStatus(UUID userId, boolean active, String adminPrincipal, String ipAddress) {
        String correlationId = MDC.get("correlationId");
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));

        // Safety: Cannot deactivate the last remaining active admin
        if (!active && user.getRole() == Role.ROLE_ADMIN) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN && u.isActive() && !u.getId().equals(userId))
                    .count();
            if (adminCount == 0) {
                throw new IllegalStateException("Cannot deactivate the last remaining active administrator");
            }
        }

        user.setActive(active);
        UserEntity saved = userRepository.save(user);

        auditService.logEvent(
                adminPrincipal,
                "USER_STATUS_UPDATED",
                "SUCCESS",
                ipAddress,
                correlationId,
                String.format("Updated active status of user %s to %s", user.getEmail(), active)
        );

        long repoCount = repositoryEntityRepository.findByOwnerId(saved.getId()).size();
        return UserAdminDto.fromEntity(saved, repoCount);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RepositoryAdminDto> getRepositories(Pageable pageable) {
        return repositoryEntityRepository.findAll(pageable).map(repo -> {
            String ownerEmail = repo.getOwner() != null ? repo.getOwner().getEmail() : "Unknown Owner";

            Instant lastAnalyzed = analysisRunRepository.findFirstByRepositoryIdOrderByStartedAtDesc(repo.getId())
                    .map(a -> a.getCompletedAt() != null ? a.getCompletedAt() : a.getStartedAt())
                    .orElse(null);

            return RepositoryAdminDto.fromEntity(repo, ownerEmail, lastAnalyzed);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public SecurityAdminOverviewDto getSecurityOverview() {
        List<SecurityFindingEntity> findings = securityFindingRepository.findAll();
        long total = findings.size();
        long critical = findings.stream().filter(f -> f.getSeverity() == Severity.CRITICAL).count();
        long high = findings.stream().filter(f -> f.getSeverity() == Severity.HIGH).count();
        long medium = findings.stream().filter(f -> f.getSeverity() == Severity.MEDIUM).count();
        long low = findings.stream().filter(f -> f.getSeverity() == Severity.LOW).count();

        Map<String, Long> categoryCounts = findings.stream()
                .collect(Collectors.groupingBy(f -> f.getCategory().name(), Collectors.counting()));

        return new SecurityAdminOverviewDto(total, critical, high, medium, low, categoryCounts);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<AuditAdminDto> getAuditLogs(Pageable pageable, String eventType, String principal) {
        Page<AuditLogEntity> page = auditLogRepository.findAll(pageable);
        List<AuditAdminDto> dtos = page.getContent().stream()
                .filter(a -> eventType == null || eventType.isBlank() || a.getEventType().equalsIgnoreCase(eventType.trim()))
                .filter(a -> principal == null || principal.isBlank() || (a.getPrincipal() != null && a.getPrincipal().toLowerCase().contains(principal.toLowerCase().trim())))
                .map(a -> new AuditAdminDto(
                        a.getId(),
                        a.getPrincipal(),
                        a.getEventType(),
                        a.getStatus(),
                        a.getIpAddress(),
                        a.getCorrelationId(),
                        a.getDetails(),
                        a.getTimestamp()
                ))
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, page.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public AiTelemetryDto getAiTelemetry() {
        var requests = aiReasoningRequestRepository.findAll();
        long total = requests.size();
        long grounded = requests.stream().filter(r -> r.getEvidenceCount() > 0).count();
        long failed = requests.stream().filter(r -> r.getSummary() != null && r.getSummary().contains("FAILED")).count();

        long estimatedInputTokens = requests.stream()
                .mapToLong(r -> r.getPromptTokens() != null ? r.getPromptTokens() : (r.getContextChars() / 4))
                .sum();
        long estimatedOutputTokens = requests.stream()
                .mapToLong(r -> r.getCompletionTokens() != null ? r.getCompletionTokens() : (r.getSummary() != null ? r.getSummary().length() / 4 : 0))
                .sum();

        Map<String, Long> queryTypes = requests.stream()
                .collect(Collectors.groupingBy(r -> r.getRequestType() != null ? r.getRequestType().name() : "REUSE_EXPLANATION", Collectors.counting()));

        return new AiTelemetryDto(total, grounded, failed, estimatedInputTokens, estimatedOutputTokens, queryTypes);
    }

    @Override
    public SystemHealthDto getSystemHealth() {
        long start = System.currentTimeMillis();
        String dbStatus = "HEALTHY";
        long latency = 0;
        try (Connection conn = dataSource.getConnection()) {
            boolean valid = conn.isValid(2);
            latency = System.currentTimeMillis() - start;
            if (!valid) {
                dbStatus = "DEGRADED";
            }
        } catch (Exception e) {
            dbStatus = "UNAVAILABLE";
            latency = System.currentTimeMillis() - start;
        }

        Runtime runtime = Runtime.getRuntime();
        long totalMem = runtime.totalMemory();
        long freeMem = runtime.freeMemory();
        int cores = runtime.availableProcessors();
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime() / 1000;

        return new SystemHealthDto(
                "HEALTHY".equals(dbStatus) ? "UP" : "DEGRADED",
                dbStatus,
                latency,
                uptime,
                totalMem,
                freeMem,
                cores,
                Instant.now()
        );
    }
}