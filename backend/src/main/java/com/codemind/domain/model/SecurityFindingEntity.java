package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "security_findings")
public class SecurityFindingEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "security_analysis_id")
    private UUID securityAnalysisId;

    @Column(name = "rule_id", nullable = false, length = 100)
    private String ruleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Severity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private SecurityCategory category;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String remediation;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(name = "symbol_id")
    private UUID symbolId;

    @Column(name = "start_line")
    private Integer startLine;

    @Column(name = "end_line")
    private Integer endLine;

    @Column(name = "evidence_snippet", columnDefinition = "TEXT")
    private String evidenceSnippet;

    @Column(nullable = false, length = 50)
    private String confidence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private FindingStatus status = FindingStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public SecurityFindingEntity() {
    }

    public SecurityFindingEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            UUID securityAnalysisId,
            String ruleId,
            Severity severity,
            SecurityCategory category,
            String message,
            String description,
            String remediation,
            String filePath,
            UUID symbolId,
            Integer startLine,
            Integer endLine,
            String evidenceSnippet,
            String confidence,
            FindingStatus status
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.securityAnalysisId = securityAnalysisId;
        this.ruleId = ruleId;
        this.severity = severity;
        this.category = category;
        this.message = message != null ? message : "";
        this.description = description != null ? description : "";
        this.remediation = remediation != null ? remediation : "";
        this.filePath = filePath;
        this.symbolId = symbolId;
        this.startLine = startLine;
        this.endLine = endLine;
        this.evidenceSnippet = evidenceSnippet != null ? evidenceSnippet : "";
        this.confidence = confidence != null ? confidence : "HIGH";
        this.status = status != null ? status : FindingStatus.OPEN;
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

    public UUID getSecurityAnalysisId() {
        return securityAnalysisId;
    }

    public void setSecurityAnalysisId(UUID securityAnalysisId) {
        this.securityAnalysisId = securityAnalysisId;
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

    public SecurityCategory getCategory() {
        return category;
    }

    public void setCategory(SecurityCategory category) {
        this.category = category;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRemediation() {
        return remediation;
    }

    public void setRemediation(String remediation) {
        this.remediation = remediation;
    }

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public UUID getSymbolId() {
        return symbolId;
    }

    public void setSymbolId(UUID symbolId) {
        this.symbolId = symbolId;
    }

    public Integer getStartLine() {
        return startLine;
    }

    public void setStartLine(Integer startLine) {
        this.startLine = startLine;
    }

    public Integer getEndLine() {
        return endLine;
    }

    public void setEndLine(Integer endLine) {
        this.endLine = endLine;
    }

    public String getEvidenceSnippet() {
        return evidenceSnippet;
    }

    public void setEvidenceSnippet(String evidenceSnippet) {
        this.evidenceSnippet = evidenceSnippet;
    }

    public String getConfidence() {
        return confidence;
    }

    public void setConfidence(String confidence) {
        this.confidence = confidence;
    }

    public FindingStatus getStatus() {
        return status;
    }

    public void setStatus(FindingStatus status) {
        this.status = status;
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
        SecurityFindingEntity that = (SecurityFindingEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
