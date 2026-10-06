package com.codemind.web.dto.admin;

public record AdminOverviewDto(
        long totalUsers,
        long activeUsers,
        long totalRepositories,
        long totalAnalyses,
        long totalSecurityFindings,
        long totalAuditEvents
) {}