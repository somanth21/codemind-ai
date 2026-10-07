package com.codemind.ai;

import com.codemind.ai.config.LlmProperties;
import com.codemind.ai.exception.LlmRateLimitExceededException;
import com.codemind.ai.exception.LlmUnavailableException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini REST API Client Implementation.
 * Uses standard java.net.http.HttpClient with zero third-party SDK lock-in.
 */
@Component
@ConditionalOnProperty(name = "codemind.llm.provider", havingValue = "GEMINI", matchIfMissing = true)
public class GeminiLlmClient implements LlmClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiLlmClient.class);
    private static final String GEMINI_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private final LlmProperties properties;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public GeminiLlmClient(LlmProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.min(10, properties.getTimeoutSeconds())))
                .build();

        log.info("Gemini LLM Provider initialized (Model: {}, KeyConfigured: {})",
                properties.getModel(), properties.isConfigured());
    }

    @Override
    public String getProviderName() {
        return "GEMINI";
    }

    @Override
    public boolean isAvailable() {
        return properties.isConfigured();
    }

    @Override
    public String getModelName() {
        return properties.getModel();
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        return executeGeminiRequest(request, "text/plain", null);
    }

    @Override
    public LlmResponse generateStructured(LlmRequest request, String schema) {
        return executeGeminiRequest(request, "application/json", schema);
    }

    private static final List<String> FALLBACK_MODELS = List.of(
            "gemini-flash-lite-latest",
            "gemini-flash-latest",
            "gemini-3.8-flash",
            "gemini-3.6-flash"
    );

    private LlmResponse executeGeminiRequest(LlmRequest request, String responseMimeType, String schema) {
        if (!isAvailable()) {
            throw new LlmUnavailableException(
                    "LLM provider is not configured or unavailable. Please configure CODEMIND_LLM_API_KEY."
            );
        }

        long startTime = System.currentTimeMillis();

        List<String> modelsToTry = new ArrayList<>();
        String primaryModel = properties.getModel();
        if (primaryModel != null && !primaryModel.isBlank()) {
            modelsToTry.add(primaryModel);
        }
        for (String fb : FALLBACK_MODELS) {
            if (!modelsToTry.contains(fb)) {
                modelsToTry.add(fb);
            }
        }

        Exception lastException = null;

        for (String modelToUse : modelsToTry) {
            String url = String.format(GEMINI_API_URL_TEMPLATE, modelToUse, properties.getApiKey());

            try {
                Map<String, Object> rootPayload = new HashMap<>();

                // Contents
                Map<String, Object> part = Map.of("text", request.prompt());
                Map<String, Object> contentItem = Map.of("parts", List.of(part));
                rootPayload.put("contents", List.of(contentItem));

                // System Instruction
                if (request.systemInstruction() != null && !request.systemInstruction().isBlank()) {
                    Map<String, Object> sysPart = Map.of("text", request.systemInstruction());
                    rootPayload.put("systemInstruction", Map.of("parts", List.of(sysPart)));
                }

                // Generation Config
                Map<String, Object> generationConfig = new HashMap<>();
                generationConfig.put("temperature", request.temperature() > 0 ? request.temperature() : properties.getTemperature());
                generationConfig.put("maxOutputTokens", request.maxTokens() > 0 ? request.maxTokens() : properties.getMaxTokens());
                generationConfig.put("responseMimeType", responseMimeType);
                rootPayload.put("generationConfig", generationConfig);

                String requestBodyJson = objectMapper.writeValueAsString(rootPayload);

                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
                        .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                        .build();

                HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
                long latencyMs = System.currentTimeMillis() - startTime;

                int statusCode = httpResponse.statusCode();
                String responseBody = httpResponse.body();

                if (statusCode == 429) {
                    log.warn("Gemini API rate limit exceeded on {}: {}", modelToUse, responseBody);
                    throw new LlmRateLimitExceededException("Upstream LLM rate limit exceeded. Please retry after some time.");
                }

                if (statusCode == 503) {
                    log.warn("Gemini model {} returned 503 (high demand), switching immediately to next candidate in fallback chain", modelToUse);
                    lastException = new LlmUnavailableException("Model " + modelToUse + " unavailable (503): " + responseBody);
                    continue;
                }

                if (statusCode == 404) {
                    log.warn("Gemini model {} not found / deprecated (404), trying next model in chain", modelToUse);
                    lastException = new LlmUnavailableException("Model " + modelToUse + " not found (404): " + responseBody);
                    continue;
                }

                if (statusCode != 200) {
                    log.error("Gemini API request failed [Status: {} on {}]: {}", statusCode, modelToUse, responseBody);
                    lastException = new LlmUnavailableException("Gemini API request failed with status " + statusCode + ": " + responseBody);
                    continue;
                }

                JsonNode rootNode = objectMapper.readTree(responseBody);
                JsonNode candidate = rootNode.path("candidates").path(0);
                String text = candidate.path("content").path("parts").path(0).path("text").asText("");
                String finishReason = candidate.path("finishReason").asText("STOP");

                JsonNode usageMetadata = rootNode.path("usageMetadata");
                Integer promptTokens = usageMetadata.has("promptTokenCount") ? usageMetadata.path("promptTokenCount").asInt() : null;
                Integer completionTokens = usageMetadata.has("candidatesTokenCount") ? usageMetadata.path("candidatesTokenCount").asInt() : null;

                return LlmResponse.success(
                        text,
                        getProviderName(),
                        modelToUse,
                        promptTokens,
                        completionTokens,
                        latencyMs,
                        request.requestId(),
                        finishReason
                );

            } catch (LlmRateLimitExceededException e) {
                throw e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new LlmUnavailableException("LLM request was interrupted: " + e.getMessage(), e);
            } catch (Exception e) {
                lastException = e;
                log.warn("Attempt on model {} failed: {}", modelToUse, e.getMessage());
            }
        }

        if (lastException instanceof LlmUnavailableException lue) {
            throw lue;
        }
        throw new LlmUnavailableException("Failed to invoke Gemini LLM provider across available models: " +
                (lastException != null ? lastException.getMessage() : "Unknown error"), lastException);
    }
}
