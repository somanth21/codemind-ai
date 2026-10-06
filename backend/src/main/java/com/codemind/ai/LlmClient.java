package com.codemind.ai;

/**
 * Core LLM Provider SPI Boundary.
 * Ensures zero vendor lock-in across Gemini, OpenAI, Claude, and local Ollama.
 */
public interface LlmClient {
    String getProviderName();
    boolean isAvailable();
    String getModelName();
    LlmResponse generate(LlmRequest request);
    LlmResponse generateStructured(LlmRequest request, String schema);
}
