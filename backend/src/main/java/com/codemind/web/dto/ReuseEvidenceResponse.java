package com.codemind.web.dto;

import com.codemind.domain.model.ReuseEvidenceEntity;

import java.util.UUID;

public class ReuseEvidenceResponse {

    private UUID id;
    private UUID candidateId;
    private String evidenceType;
    private String description;
    private String sourceFile;
    private Integer startLine;
    private Integer endLine;
    private Double metricValue;

    public ReuseEvidenceResponse() {
    }

    public ReuseEvidenceResponse(
            UUID id,
            UUID candidateId,
            String evidenceType,
            String description,
            String sourceFile,
            Integer startLine,
            Integer endLine,
            Double metricValue
    ) {
        this.id = id;
        this.candidateId = candidateId;
        this.evidenceType = evidenceType;
        this.description = description;
        this.sourceFile = sourceFile;
        this.startLine = startLine;
        this.endLine = endLine;
        this.metricValue = metricValue;
    }

    public static ReuseEvidenceResponse fromEntity(ReuseEvidenceEntity entity) {
        return new ReuseEvidenceResponse(
                entity.getId(),
                entity.getCandidateId(),
                entity.getEvidenceType() != null ? entity.getEvidenceType().name() : null,
                entity.getDescription(),
                entity.getSourceFile(),
                entity.getStartLine(),
                entity.getEndLine(),
                entity.getMetricValue()
        );
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public UUID getCandidateId() {
        return candidateId;
    }

    public void setCandidateId(UUID candidateId) {
        this.candidateId = candidateId;
    }

    public String getEvidenceType() {
        return evidenceType;
    }

    public void setEvidenceType(String evidenceType) {
        this.evidenceType = evidenceType;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSourceFile() {
        return sourceFile;
    }

    public void setSourceFile(String sourceFile) {
        this.sourceFile = sourceFile;
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

    public Double getMetricValue() {
        return metricValue;
    }

    public void setMetricValue(Double metricValue) {
        this.metricValue = metricValue;
    }
}
