package com.codemind.web.controller;

import com.codemind.admin.service.AdminService;
import com.codemind.domain.model.Role;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.admin.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewDto> getOverview() {
        return ResponseEntity.ok(adminService.getOverview());
    }

    @GetMapping("/users")
    public ResponseEntity<Page<UserAdminDto>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminService.getUsers(pageable, search));
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<UserAdminDto> updateUserRole(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        UserAdminDto updated = adminService.updateUserRole(id, request.role(), principal.getUsername(), clientIp);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserAdminDto> updateUserStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal UserPrincipal principal,
            HttpServletRequest servletRequest
    ) {
        String clientIp = servletRequest.getRemoteAddr();
        UserAdminDto updated = adminService.updateUserStatus(id, request.active(), principal.getUsername(), clientIp);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/repositories")
    public ResponseEntity<Page<RepositoryAdminDto>> getRepositories(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(adminService.getRepositories(pageable));
    }

    @GetMapping("/security")
    public ResponseEntity<SecurityAdminOverviewDto> getSecurityOverview() {
        return ResponseEntity.ok(adminService.getSecurityOverview());
    }

    @GetMapping("/audit")
    public ResponseEntity<Page<AuditAdminDto>> getAuditLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String eventType,
            @RequestParam(required = false) String principal
    ) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
        return ResponseEntity.ok(adminService.getAuditLogs(pageable, eventType, principal));
    }

    @GetMapping("/ai")
    public ResponseEntity<AiTelemetryDto> getAiTelemetry() {
        return ResponseEntity.ok(adminService.getAiTelemetry());
    }

    @GetMapping("/health")
    public ResponseEntity<SystemHealthDto> getSystemHealth() {
        return ResponseEntity.ok(adminService.getSystemHealth());
    }
}