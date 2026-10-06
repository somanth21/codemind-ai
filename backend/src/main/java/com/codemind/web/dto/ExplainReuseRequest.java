package com.codemind.web.dto;

import java.util.UUID;

public record ExplainReuseRequest(
        UUID reuseAnalysisId,
        UUID candidateId,
        String developerQuestion
) {}
