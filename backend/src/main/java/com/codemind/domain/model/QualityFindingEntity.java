package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "quality_findings")
public class QualityFindingEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(name = "symbol_id")
    private UUID symbolId;

    @Column(name = "rule_id", nullable = false, length = 100)
    private String ruleId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private Severity severity;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "line_number")
    private Integer lineNumber;

    @Column(length = 1000)
    private String evidence;

    public QualityFindingEntity() {
    }

    public QualityFindingEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            UUID symbolId,
            String ruleId,
            Severity severity,
            String title,
            String description,
            Integer lineNumber,
            String evidence
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.filePath = filePath;
        this.symbolId = symbolId;
        this.ruleId = ruleId;
        this.severity = severity;
        this.title = title;
        this.description = description;
        this.lineNumber = lineNumber;
        this.evidence = evidence;
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

    public UUID getSymbolId() {
        return symbolId;
    }

    public void setSymbolId(UUID symbolId) {
        this.symbolId = symbolId;
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

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    public String getEvidence() {
        return evidence;
    }

    public void setEvidence(String evidence) {
        this.evidence = evidence;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        QualityFindingEntity that = (QualityFindingEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
