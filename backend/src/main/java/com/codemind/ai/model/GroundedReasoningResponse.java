package com.codemind.ai.model;

import java.util.Collections;
import java.util.List;

public record GroundedReasoningResponse(
        String summary,
        String recommendation,
        List<ReasoningStep> reasoning,
        List<String> limitations,
        double confidence
) {
    public GroundedReasoningResponse {
        if (summary == null) summary = "";
        if (recommendation == null) recommendation = "";
        if (reasoning == null) reasoning = Collections.emptyList();
        if (limitations == null) limitations = Collections.emptyList();
    }
}
