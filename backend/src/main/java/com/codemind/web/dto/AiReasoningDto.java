package com.codemind.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AiReasoningDto(
        UUID id,
        UUID repositoryId,
        UUID reuseAnalysisId,
        String requestType,
        String provider,
        String model,
        String summary,
        String recommendation,
        List<ClaimDto> reasoning,
        List<String> limitations,
        double confidence,
        List<EvidenceDto> evidence,
        int contextChars,
        boolean contextTruncated,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens,
        long latencyMs,
        double citationCoverage,
        boolean grounded,
        boolean securityGatePreserved,
        Instant createdAt
) {
    public record ClaimDto(
            String claim,
            List<String> evidenceIds
    ) {}

    public record EvidenceDto(
            String evidenceId,
            String filePath,
            String symbolName,
            Integer startLine,
            Integer endLine,
            String evidenceType,
            Double deterministicScore,
            String sanitizedSnippet
    ) {}
}
