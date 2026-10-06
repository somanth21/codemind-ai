package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "secret_findings")
public class SecretFindingEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(name = "rule_id", nullable = false, length = 100)
    private String ruleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Severity severity;

    @Column(nullable = false, length = 50)
    private String confidence;

    @Column(name = "line_number")
    private Integer lineNumber;

    @Column(name = "redacted_evidence", nullable = false, length = 500)
    private String redactedEvidence;

    public SecretFindingEntity() {
    }

    public SecretFindingEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            String ruleId,
            Severity severity,
            String confidence,
            Integer lineNumber,
            String redactedEvidence
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.filePath = filePath;
        this.ruleId = ruleId;
        this.severity = severity;
        this.confidence = confidence;
        this.lineNumber = lineNumber;
        this.redactedEvidence = redactedEvidence;
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
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

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public String getRuleId() {
        return ruleId;
    }

    public void setRuleId(String ruleId) {
        this.ruleId = ruleId;
    }

    public Severity getSeverity() {
        return severity;
    }

    public void setSeverity(Severity severity) {
        this.severity = severity;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    public String getRedactedEvidence() {
        return redactedEvidence;
    }

    public void setRedactedEvidence(String redactedEvidence) {
        this.redactedEvidence = redactedEvidence;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SecretFindingEntity that = (SecretFindingEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
