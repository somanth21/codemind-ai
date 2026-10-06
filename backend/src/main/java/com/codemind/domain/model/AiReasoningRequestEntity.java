package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "ai_reasoning_requests")
public class AiReasoningRequestEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "reuse_analysis_id")
    private UUID reuseAnalysisId;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "request_type", nullable = false, length = 50)
    private AiRequestType requestType;

    @Column(nullable = false, length = 50)
    private String provider;

    @Column(nullable = false, length = 100)
    private String model;

    @Column(name = "evidence_count", nullable = false)
    private int evidenceCount = 0;

    @Column(name = "context_chars", nullable = false)
    private int contextChars = 0;

    @Column(name = "context_truncated", nullable = false)
    private boolean contextTruncated = false;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    @Column(name = "completion_tokens")
    private Integer completionTokens;

    @Column(name = "latency_ms", nullable = false)
    private long latencyMs = 0;

    @Column(length = 50)
    private String decision;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    @Column(name = "response_json", nullable = false, columnDefinition = "TEXT")
    private String responseJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AiReasoningRequestEntity() {
    }

    public AiReasoningRequestEntity(
            UUID id,
            UUID repositoryId,
            UUID reuseAnalysisId,
            UUID userId,
            AiRequestType requestType,
            String provider,
            String model,
            int evidenceCount,
            int contextChars,
            boolean contextTruncated,
            Integer promptTokens,
            Integer completionTokens,
            long latencyMs,
            String decision,
            String summary,
            String responseJson
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.reuseAnalysisId = reuseAnalysisId;
        this.userId = userId;
        this.requestType = requestType;
        this.provider = provider;
        this.model = model;
        this.evidenceCount = evidenceCount;
        this.contextChars = contextChars;
        this.contextTruncated = contextTruncated;
        this.promptTokens = promptTokens;
        this.completionTokens = completionTokens;
        this.latencyMs = latencyMs;
        this.decision = decision;
        this.summary = summary != null ? summary : "";
        this.responseJson = responseJson != null ? responseJson : "";
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getRepositoryId() {
        return repositoryId;
    }

    public void setRepositoryId(UUID repositoryId) {
        this.repositoryId = repositoryId;
    }

    public UUID getReuseAnalysisId() {
        return reuseAnalysisId;
    }

    public void setReuseAnalysisId(UUID reuseAnalysisId) {
        this.reuseAnalysisId = reuseAnalysisId;
    }

    public UUID getUserId() {
        return userId;
    }

    public void setUserId(UUID userId) {
        this.userId = userId;
    }

    public AiRequestType getRequestType() {
        return requestType;
    }

    public void setRequestType(AiRequestType requestType) {
        this.requestType = requestType;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public String getModel() {
        return model;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public int getEvidenceCount() {
        return evidenceCount;
    }

    public void setEvidenceCount(int evidenceCount) {
        this.evidenceCount = evidenceCount;
    }

    public int getContextChars() {
        return contextChars;
    }

    public void setContextChars(int contextChars) {
        this.contextChars = contextChars;
    }

    public boolean isContextTruncated() {
        return contextTruncated;
    }

    public void setContextTruncated(boolean contextTruncated) {
        this.contextTruncated = contextTruncated;
    }

    public Integer getPromptTokens() {
        return promptTokens;
    }

    public void setPromptTokens(Integer promptTokens) {
        this.promptTokens = promptTokens;
    }

    public Integer getCompletionTokens() {
        return completionTokens;
    }

    public void setCompletionTokens(Integer completionTokens) {
        this.completionTokens = completionTokens;
    }

    public long getLatencyMs() {
        return latencyMs;
    }

    public void setLatencyMs(long latencyMs) {
        this.latencyMs = latencyMs;
    }

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getResponseJson() {
        return responseJson;
    }

    public void setResponseJson(String responseJson) {
        this.responseJson = responseJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AiReasoningRequestEntity that = (AiReasoningRequestEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
