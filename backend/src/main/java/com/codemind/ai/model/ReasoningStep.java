package com.codemind.ai.model;

import java.util.Collections;
import java.util.List;

public record ReasoningStep(
        String claim,
        List<String> evidenceIds
) {
    public ReasoningStep {
        if (evidenceIds == null) {
            evidenceIds = Collections.emptyList();
        }
    }
}
