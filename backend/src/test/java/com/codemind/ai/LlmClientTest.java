package com.codemind.ai;

import com.codemind.ai.config.LlmProperties;
import com.codemind.ai.exception.LlmRateLimitExceededException;
import com.codemind.ai.exception.LlmUnavailableException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LlmClientTest {

    @Test
    @DisplayName("GeminiLlmClient reports unavailable when API key is default placeholder")
    void geminiUnavailableWithPlaceholder() {
        LlmProperties props = new LlmProperties();
        props.setApiKey("placeholder_api_key");
        props.setModel("gemini-1.5-pro");

        GeminiLlmClient client = new GeminiLlmClient(props, new ObjectMapper());

        assertFalse(client.isAvailable());
        assertEquals("GEMINI", client.getProviderName());
        assertEquals("gemini-1.5-pro", client.getModelName());

        LlmRequest request = LlmRequest.simple("test prompt");
        assertThrows(LlmUnavailableException.class, () -> client.generate(request));
    }

    @Test
    @DisplayName("GeminiLlmClient reports available when API key is set")
    void geminiAvailableWithRealKey() {
        LlmProperties props = new LlmProperties();
        props.setApiKey("valid_test_api_key_12345");

        GeminiLlmClient client = new GeminiLlmClient(props, new ObjectMapper());

        assertTrue(client.isAvailable());
    }

    @Test
    @DisplayName("MockLlmClient returns deterministic structured response citing evidence")
    void mockLlmClientDefaultResponse() {
        MockLlmClient mockClient = new MockLlmClient();
        assertTrue(mockClient.isAvailable());
        assertEquals("MOCK", mockClient.getProviderName());

        LlmRequest request = LlmRequest.simple("test prompt");
        LlmResponse response = mockClient.generateStructured(request, null);

        assertNotNull(response);
        assertEquals("MOCK", response.provider());
        assertTrue(response.content().contains("summary"));
        assertTrue(response.content().contains("recommendation"));
        assertTrue(response.latencyMs() > 0);
    }

    @Test
    @DisplayName("MockLlmClient simulates rate limit fault")
    void mockLlmClientRateLimitSimulation() {
        MockLlmClient mockClient = new MockLlmClient();
        mockClient.setSimulateRateLimit(true);

        LlmRequest request = LlmRequest.simple("test");
        assertThrows(LlmRateLimitExceededException.class, () -> mockClient.generate(request));
    }

    @Test
    @DisplayName("MockLlmClient simulates unavailable state")
    void mockLlmClientUnavailableSimulation() {
        MockLlmClient mockClient = new MockLlmClient();
        mockClient.setSimulateUnavailable(true);

        assertFalse(mockClient.isAvailable());
        LlmRequest request = LlmRequest.simple("test");
        assertThrows(LlmUnavailableException.class, () -> mockClient.generate(request));
    }
}
