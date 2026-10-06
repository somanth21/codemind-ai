package com.codemind.domain.model;

import jakarta.persistence.*;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "file_metrics")
public class FileMetricsEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "file_path", nullable = false, length = 1000)
    private String filePath;

    @Column(nullable = false)
    private int loc = 0;

    @Column(nullable = false)
    private int lloc = 0;

    @Column(name = "cyclomatic_complexity", nullable = false)
    private int cyclomaticComplexity = 0;

    @Column(name = "class_count", nullable = false)
    private int classCount = 0;

    @Column(name = "method_count", nullable = false)
    private int methodCount = 0;

    @Column(name = "halstead_volume")
    private double halsteadVolume = 0.0;

    @Column(name = "maintainability_index")
    private double maintainabilityIndex = 0.0;

    public FileMetricsEntity() {
    }

    public FileMetricsEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            String filePath,
            int loc,
            int lloc,
            int cyclomaticComplexity,
            int classCount,
            int methodCount,
            double halsteadVolume,
            double maintainabilityIndex
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.filePath = filePath;
        this.loc = loc;
        this.lloc = lloc;
        this.cyclomaticComplexity = cyclomaticComplexity;
        this.classCount = classCount;
        this.methodCount = methodCount;
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

    public String getFilePath() {
        return filePath;
    }

    public void setFilePath(String filePath) {
        this.filePath = filePath;
    }

    public int getLoc() {
        return loc;
    }

    public void setLoc(int loc) {
        this.loc = loc;
    }

    public int getLloc() {
        return lloc;
    }

    public void setLloc(int lloc) {
        this.lloc = lloc;
    }

    public int getCyclomaticComplexity() {
        return cyclomaticComplexity;
    }

    public void setCyclomaticComplexity(int cyclomaticComplexity) {
        this.cyclomaticComplexity = cyclomaticComplexity;
    }

    public int getClassCount() {
        return classCount;
    }

    public void setClassCount(int classCount) {
        this.classCount = classCount;
    }

    public int getMethodCount() {
        return methodCount;
    }

    public void setMethodCount(int methodCount) {
        this.methodCount = methodCount;
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
        FileMetricsEntity that = (FileMetricsEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
