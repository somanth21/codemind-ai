package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "relationships")
public class RelationshipEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "source_symbol_id")
    private UUID sourceSymbolId;

    @Column(name = "target_symbol_id")
    private UUID targetSymbolId;

    @Column(name = "source_fqn", length = 1000)
    private String sourceFqn;

    @Column(name = "target_fqn", length = 1000)
    private String targetFqn;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type", nullable = false, length = 50)
    private RelationshipType relationshipType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RelationshipConfidence confidence = RelationshipConfidence.RESOLVED;

    @Column(name = "line_number")
    private Integer lineNumber;

    public RelationshipEntity() {
    }

    public RelationshipEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            UUID sourceSymbolId,
            UUID targetSymbolId,
            String sourceFqn,
            String targetFqn,
            RelationshipType relationshipType,
            RelationshipConfidence confidence,
            Integer lineNumber
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.sourceSymbolId = sourceSymbolId;
        this.targetSymbolId = targetSymbolId;
        this.sourceFqn = sourceFqn;
        this.targetFqn = targetFqn;
        this.relationshipType = relationshipType;
        this.confidence = confidence != null ? confidence : RelationshipConfidence.RESOLVED;
        this.lineNumber = lineNumber;
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

    public UUID getSourceSymbolId() {
        return sourceSymbolId;
    }

    public void setSourceSymbolId(UUID sourceSymbolId) {
        this.sourceSymbolId = sourceSymbolId;
    }

    public UUID getTargetSymbolId() {
        return targetSymbolId;
    }

    public void setTargetSymbolId(UUID targetSymbolId) {
        this.targetSymbolId = targetSymbolId;
    }

    public String getSourceFqn() {
        return sourceFqn;
    }

    public void setSourceFqn(String sourceFqn) {
        this.sourceFqn = sourceFqn;
    }

    public String getTargetFqn() {
        return targetFqn;
    }

    public void setTargetFqn(String targetFqn) {
        this.targetFqn = targetFqn;
    }

    public RelationshipType getRelationshipType() {
        return relationshipType;
    }

    public void setRelationshipType(RelationshipType relationshipType) {
        this.relationshipType = relationshipType;
    }

    public RelationshipConfidence getConfidence() {
        return confidence;
    }

    public void setConfidence(RelationshipConfidence confidence) {
        this.confidence = confidence;
    }

    public Integer getLineNumber() {
        return lineNumber;
    }

    public void setLineNumber(Integer lineNumber) {
        this.lineNumber = lineNumber;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RelationshipEntity that = (RelationshipEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
