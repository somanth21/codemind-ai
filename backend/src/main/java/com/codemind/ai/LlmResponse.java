package com.codemind.ai;

public record LlmResponse(
        String content,
        String provider,
        String model,
        Integer promptTokens,
        Integer completionTokens,
        Integer totalTokens,
        long latencyMs,
        String requestId,
        String finishReason
) {
    public static LlmResponse success(
            String content,
            String provider,
            String model,
            Integer promptTokens,
            Integer completionTokens,
            long latencyMs,
            String requestId,
            String finishReason
    ) {
        int total = (promptTokens != null ? promptTokens : 0) + (completionTokens != null ? completionTokens : 0);
        return new LlmResponse(
                content,
                provider,
                model,
                promptTokens,
                completionTokens,
                total,
                latencyMs,
                requestId,
                finishReason != null ? finishReason : "STOP"
        );
    }
}
