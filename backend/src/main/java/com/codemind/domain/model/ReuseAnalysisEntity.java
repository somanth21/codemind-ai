package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "reuse_analyses")
public class ReuseAnalysisEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(nullable = false, length = 500)
    private String query;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ReuseDecision decision = ReuseDecision.CREATE_NEW;

    @Column(name = "overall_score", nullable = false)
    private double overallScore = 0.0;

    @Column(nullable = false)
    private double confidence = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "security_status", nullable = false, length = 50)
    private SecurityGateStatus securityStatus = SecurityGateStatus.SAFE;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String explanation;

    @Column(columnDefinition = "TEXT")
    private String reasons;

    @Column(name = "config_version", nullable = false, length = 50)
    private String configVersion = "v1.0";

    @Column(name = "weights_json", length = 1000)
    private String weightsJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ReuseAnalysisEntity() {
    }

    public ReuseAnalysisEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            String query,
            ReuseDecision decision,
            double overallScore,
            double confidence,
            SecurityGateStatus securityStatus,
            String explanation,
            String reasons,
            String configVersion,
            String weightsJson
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.query = query;
        this.decision = decision != null ? decision : ReuseDecision.CREATE_NEW;
        this.overallScore = overallScore;
        this.confidence = confidence;
        this.securityStatus = securityStatus != null ? securityStatus : SecurityGateStatus.SAFE;
        this.explanation = explanation != null ? explanation : "";
        this.reasons = reasons;
        this.configVersion = configVersion != null ? configVersion : "v1.0";
        this.weightsJson = weightsJson;
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

    public UUID getAnalysisId() {
        return analysisId;
    }

    public void setAnalysisId(UUID analysisId) {
        this.analysisId = analysisId;
    }

    public String getQuery() {
        return query;
    }

    public void setQuery(String query) {
        this.query = query;
    }

    public ReuseDecision getDecision() {
        return decision;
    }

    public void setDecision(ReuseDecision decision) {
        this.decision = decision;
    }

    public double getOverallScore() {
        return overallScore;
    }

    public void setOverallScore(double overallScore) {
        this.overallScore = overallScore;
    }

    public double getConfidence() {
        return confidence;
    }

    public void setConfidence(double confidence) {
        this.confidence = confidence;
    }

    public SecurityGateStatus getSecurityStatus() {
        return securityStatus;
    }

    public void setSecurityStatus(SecurityGateStatus securityStatus) {
        this.securityStatus = securityStatus;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public String getReasons() {
        return reasons;
    }

    public void setReasons(String reasons) {
        this.reasons = reasons;
    }

    public String getConfigVersion() {
        return configVersion;
    }

    public void setConfigVersion(String configVersion) {
        this.configVersion = configVersion;
    }

    public String getWeightsJson() {
        return weightsJson;
    }

    public void setWeightsJson(String weightsJson) {
        this.weightsJson = weightsJson;
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
        ReuseAnalysisEntity that = (ReuseAnalysisEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
