package com.codemind.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "codemind.llm")
public class LlmProperties {

    private String provider = "GEMINI";
    private String apiKey = "placeholder_api_key";
    private String model = "gemini-1.5-pro";
    private double temperature = 0.1;
    private int maxTokens = 2048;
    private int timeoutSeconds = 15;
    private int rateLimitPerUserPerMinute = 10;
    private int rateLimitPerRepoPerMinute = 20;

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getApiKey() {
        return apiKey;
    }

    public void setApiKey(String apiKey) {
        this.apiKey = apiKey;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public double getTemperature() {
        return temperature;
    }

    public void setTemperature(double temperature) {
        this.temperature = temperature;
    }

    public int getMaxTokens() {
        return maxTokens;
    }

    public void setMaxTokens(int maxTokens) {
        this.maxTokens = maxTokens;
    }

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    public void setTimeoutSeconds(int timeoutSeconds) {
        this.timeoutSeconds = timeoutSeconds;
    }

    public int getRateLimitPerUserPerMinute() {
        return rateLimitPerUserPerMinute;
    }

    public void setRateLimitPerUserPerMinute(int rateLimitPerUserPerMinute) {
        this.rateLimitPerUserPerMinute = rateLimitPerUserPerMinute;
    }

    public int getRateLimitPerRepoPerMinute() {
        return rateLimitPerRepoPerMinute;
    }

    public void setRateLimitPerRepoPerMinute(int rateLimitPerRepoPerMinute) {
        this.rateLimitPerRepoPerMinute = rateLimitPerRepoPerMinute;
    }

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank() && !"placeholder_api_key".equalsIgnoreCase(apiKey.trim());
    }
}
