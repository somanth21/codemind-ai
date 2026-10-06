package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "symbol_metrics")
public class SymbolMetricsEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "symbol_id", nullable = false)
    private UUID symbolId;

    @Column(nullable = false)
    private int loc = 0;

    @Column(name = "cyclomatic_complexity", nullable = false)
    private int cyclomaticComplexity = 1;

    @Column(name = "nesting_depth", nullable = false)
    private int nestingDepth = 0;

    @Column(name = "parameter_count", nullable = false)
    private int parameterCount = 0;

    @Column(name = "halstead_volume")
    private double halsteadVolume = 0.0;

    @Column(name = "maintainability_index")
    private double maintainabilityIndex = 0.0;

    public SymbolMetricsEntity() {
    }

    public SymbolMetricsEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            UUID symbolId,
            int loc,
            int cyclomaticComplexity,
            int nestingDepth,
            int parameterCount,
            double halsteadVolume,
            double maintainabilityIndex
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.symbolId = symbolId;
        this.loc = loc;
        this.cyclomaticComplexity = cyclomaticComplexity;
        this.nestingDepth = nestingDepth;
        this.parameterCount = parameterCount;
        this.halsteadVolume = halsteadVolume;
        this.maintainabilityIndex = maintainabilityIndex;
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

    public UUID getSymbolId() {
        return symbolId;
    }

    public void setSymbolId(UUID symbolId) {
        this.symbolId = symbolId;
    }

    public int getLoc() {
        return loc;
    }

    public void setLoc(int loc) {
        this.loc = loc;
    }

    public int getCyclomaticComplexity() {
        return cyclomaticComplexity;
    }

    public void setCyclomaticComplexity(int cyclomaticComplexity) {
        this.cyclomaticComplexity = cyclomaticComplexity;
    }

    public int getNestingDepth() {
        return nestingDepth;
    }

    public void setNestingDepth(int nestingDepth) {
        this.nestingDepth = nestingDepth;
    }

    public int getParameterCount() {
        return parameterCount;
    }

    public void setParameterCount(int parameterCount) {
        this.parameterCount = parameterCount;
    }

    public double getHalsteadVolume() {
        return halsteadVolume;
    }

    public void setHalsteadVolume(double halsteadVolume) {
        this.halsteadVolume = halsteadVolume;
    }

    public double getMaintainabilityIndex() {
        return maintainabilityIndex;
    }

    public void setMaintainabilityIndex(double maintainabilityIndex) {
        this.maintainabilityIndex = maintainabilityIndex;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        SymbolMetricsEntity that = (SymbolMetricsEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
