package com.codemind.web.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record ExplainEvidenceRequest(
        @NotBlank(message = "Query must not be blank")
        String query,
        UUID analysisId,
        Integer limit
) {}
