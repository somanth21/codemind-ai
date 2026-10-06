package com.codemind.ai;

import com.codemind.ai.evidence.EvidenceChunk;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

public record LlmRequest(
        String requestId,
        String prompt,
        String systemInstruction,
        List<EvidenceChunk> evidence,
        int maxTokens,
        double temperature,
        String responseMimeType
) {
    public LlmRequest {
        if (requestId == null || requestId.isBlank()) {
            requestId = UUID.randomUUID().toString();
        }
        if (evidence == null) {
            evidence = Collections.emptyList();
        }
        if (responseMimeType == null || responseMimeType.isBlank()) {
            responseMimeType = "application/json";
        }
    }

    public static LlmRequest structured(String prompt, String systemInstruction, List<EvidenceChunk> evidence, int maxTokens) {
        return new LlmRequest(
                UUID.randomUUID().toString(),
                prompt,
                systemInstruction,
                evidence,
                maxTokens > 0 ? maxTokens : 2048,
                0.1,
                "application/json"
        );
    }

    public static LlmRequest simple(String prompt) {
        return new LlmRequest(
                UUID.randomUUID().toString(),
                prompt,
                "You are CodeMind AI, a repository understanding assistant.",
                Collections.emptyList(),
                2048,
                0.2,
                "text/plain"
        );
    }
}
