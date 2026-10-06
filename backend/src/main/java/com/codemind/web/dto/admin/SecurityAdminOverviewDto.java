package com.codemind.web.dto.admin;

import java.util.Map;

public record SecurityAdminOverviewDto(
        long totalFindings,
        long criticalCount,
        long highCount,
        long mediumCount,
        long lowCount,
        Map<String, Long> categoryCounts
) {}