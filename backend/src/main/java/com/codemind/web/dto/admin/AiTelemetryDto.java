package com.codemind.web.dto.admin;

import java.util.Map;

public record AiTelemetryDto(
        long totalRequests,
        long groundedRequests,
        long failedRequests,
        long estimatedInputTokens,
        long estimatedOutputTokens,
        Map<String, Long> queryTypeCounts
) {}