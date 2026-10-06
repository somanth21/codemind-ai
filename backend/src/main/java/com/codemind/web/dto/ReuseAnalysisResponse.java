package com.codemind.web.dto;

import com.codemind.domain.model.ReuseAnalysisEntity;
import com.codemind.reuse.ReuseService;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

public class ReuseAnalysisResponse {

    private UUID id;
    private UUID repositoryId;
    private UUID analysisId;
    private String query;
    private String decision;
    private double overallScore;
    private double confidence;
    private String securityStatus;
    private String explanation;
    private String configVersion;
    private String weightsJson;
    private Instant createdAt;
    private List<ReuseCandidateResponse> candidates;

    public ReuseAnalysisResponse() {
    }

    public static ReuseAnalysisResponse fromEntity(ReuseAnalysisEntity entity, List<ReuseCandidateResponse> candidates) {
        ReuseAnalysisResponse res = new ReuseAnalysisResponse();
        res.id = entity.getId();
        res.repositoryId = entity.getRepositoryId();
        res.analysisId = entity.getAnalysisId();
        res.query = entity.getQuery();
        res.decision = entity.getDecision() != null ? entity.getDecision().name() : null;
        res.overallScore = entity.getOverallScore();
        res.confidence = entity.getConfidence();
        res.securityStatus = entity.getSecurityStatus() != null ? entity.getSecurityStatus().name() : null;
        res.explanation = entity.getExplanation();
        res.configVersion = entity.getConfigVersion();
        res.weightsJson = entity.getWeightsJson();
        res.createdAt = entity.getCreatedAt();
        res.candidates = candidates != null ? candidates : Collections.emptyList();
        return res;
    }

    public static ReuseAnalysisResponse fromResult(ReuseService.ReuseAnalysisResult result) {
        ReuseAnalysisResponse res = fromEntity(result.analysis(), Collections.emptyList());
        if (result.candidates() != null) {
            res.candidates = result.candidates().stream()
                    .map(ReuseCandidateResponse::fromCandidateWithEvidence)
                    .collect(Collectors.toList());
        }
        return res;
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

    public String getDecision() {
        return decision;
    }

    public void setDecision(String decision) {
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

    public String getSecurityStatus() {
        return securityStatus;
    }

    public void setSecurityStatus(String securityStatus) {
        this.securityStatus = securityStatus;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
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

    public List<ReuseCandidateResponse> getCandidates() {
        return candidates;
    }

    public void setCandidates(List<ReuseCandidateResponse> candidates) {
        this.candidates = candidates;
    }
}
