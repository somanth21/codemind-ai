package com.codemind.ai;

import com.codemind.ai.exception.LlmRateLimitExceededException;
import com.codemind.ai.exception.LlmUnavailableException;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Deterministic Mock LLM Client for unit, integration, and security test suites.
 * Provides configurable responses and fault injection without network calls.
 */
@Component
@ConditionalOnProperty(name = "codemind.llm.provider", havingValue = "MOCK")
public class MockLlmClient implements LlmClient {

    private boolean available = true;
    private String customResponse = null;
    private boolean simulateMalformedJson = false;
    private boolean simulateRateLimit = false;
    private boolean simulateUnavailable = false;
    private long simulatedLatencyMs = 25L;
    private LlmRequest lastRequest;
    private final List<LlmRequest> allRequests = new ArrayList<>();

    @Override
    public String getProviderName() {
        return "MOCK";
    }

    @Override
    public boolean isAvailable() {
        return available && !simulateUnavailable;
    }

    @Override
    public String getModelName() {
        return "mock-reasoning-v1";
    }

    @Override
    public LlmResponse generate(LlmRequest request) {
        return handleRequest(request);
    }

    @Override
    public LlmResponse generateStructured(LlmRequest request, String schema) {
        return handleRequest(request);
    }

    private LlmResponse handleRequest(LlmRequest request) {
        this.lastRequest = request;
        this.allRequests.add(request);

        if (!isAvailable()) {
            throw new LlmUnavailableException("Mock LLM Provider is unavailable.");
        }

        if (simulateRateLimit) {
            throw new LlmRateLimitExceededException("Mock LLM Provider rate limit exceeded.");
        }

        if (simulateMalformedJson) {
            return LlmResponse.success(
                    "{ this is invalid unparseable json response [E1] }",
                    getProviderName(),
                    getModelName(),
                    100,
                    20,
                    simulatedLatencyMs,
                    request.requestId(),
                    "STOP"
            );
        }

        if (customResponse != null) {
            return LlmResponse.success(
                    customResponse,
                    getProviderName(),
                    getModelName(),
                    150,
                    80,
                    simulatedLatencyMs,
                    request.requestId(),
                    "STOP"
            );
        }

        // Default grounded response citing evidence if present
        String e1 = !request.evidence().isEmpty() ? request.evidence().get(0).evidenceId() : "E1";
        String e2 = request.evidence().size() > 1 ? request.evidence().get(1).evidenceId() : e1;

        String defaultJson = String.format("""
                {
                  "summary": "Verified repository components and evaluated candidate reuse feasibility.",
                  "recommendation": "Candidate is structurally sound and compatible with repository architecture.",
                  "reasoning": [
                    {
                      "claim": "Candidate provides verified method implementation matching requirements.",
                      "evidenceIds": ["%s"]
                    },
                    {
                      "claim": "Candidate passes quality and security architectural constraints.",
                      "evidenceIds": ["%s"]
                    }
                  ],
                  "limitations": [
                    "Verify caller parameters in client integration."
                  ],
                  "confidence": 0.92
                }
                """, e1, e2);

        return LlmResponse.success(
                defaultJson,
                getProviderName(),
                getModelName(),
                150,
                80,
                simulatedLatencyMs,
                request.requestId(),
                "STOP"
        );
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public void setCustomResponse(String customResponse) {
        this.customResponse = customResponse;
    }

    public void setSimulateMalformedJson(boolean simulateMalformedJson) {
        this.simulateMalformedJson = simulateMalformedJson;
    }

    public void setSimulateRateLimit(boolean simulateRateLimit) {
        this.simulateRateLimit = simulateRateLimit;
    }

    public void setSimulateUnavailable(boolean simulateUnavailable) {
        this.simulateUnavailable = simulateUnavailable;
    }

    public void setSimulatedLatencyMs(long simulatedLatencyMs) {
        this.simulatedLatencyMs = simulatedLatencyMs;
    }

    public LlmRequest getLastRequest() {
        return lastRequest;
    }

    public List<LlmRequest> getAllRequests() {
        return allRequests;
    }

    public void reset() {
        this.available = true;
        this.customResponse = null;
        this.simulateMalformedJson = false;
        this.simulateRateLimit = false;
        this.simulateUnavailable = false;
        this.lastRequest = null;
        this.allRequests.clear();
    }
}
