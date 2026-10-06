package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "architecture_analyses")
public class ArchitectureAnalysisEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "repository_id", nullable = false)
    private UUID repositoryId;

    @Column(name = "analysis_id", nullable = false)
    private UUID analysisId;

    @Column(name = "package_count", nullable = false)
    private int packageCount = 0;

    @Column(name = "class_count", nullable = false)
    private int classCount = 0;

    @Column(name = "interface_count", nullable = false)
    private int interfaceCount = 0;

    @Column(name = "dependency_count", nullable = false)
    private int dependencyCount = 0;

    @Column(name = "cycle_count", nullable = false)
    private int cycleCount = 0;

    @Column(name = "hotspot_count", nullable = false)
    private int hotspotCount = 0;

    @Column(name = "smell_count", nullable = false)
    private int smellCount = 0;

    @Column(name = "average_complexity", nullable = false)
    private double averageComplexity = 0.0;

    @Column(name = "average_maintainability", nullable = false)
    private double averageMaintainability = 0.0;

    @Column(name = "package_stats_json", nullable = false, columnDefinition = "TEXT")
    private String packageStatsJson = "[]";

    @Column(name = "cycles_json", nullable = false, columnDefinition = "TEXT")
    private String cyclesJson = "[]";

    @Column(name = "hotspots_json", nullable = false, columnDefinition = "TEXT")
    private String hotspotsJson = "[]";

    @Column(name = "smells_json", nullable = false, columnDefinition = "TEXT")
    private String smellsJson = "[]";

    @Column(name = "metrics_json", nullable = false, columnDefinition = "TEXT")
    private String metricsJson = "{}";

    @Column(name = "graph_json", nullable = false, columnDefinition = "TEXT")
    private String graphJson = "{}";

    @Column(nullable = false, length = 50)
    private String status = "COMPLETED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ArchitectureAnalysisEntity() {
    }

    public ArchitectureAnalysisEntity(
            UUID id,
            UUID repositoryId,
            UUID analysisId,
            int packageCount,
            int classCount,
            int interfaceCount,
            int dependencyCount,
            int cycleCount,
            int hotspotCount,
            int smellCount,
            double averageComplexity,
            double averageMaintainability,
            String packageStatsJson,
            String cyclesJson,
            String hotspotsJson,
            String smellsJson,
            String metricsJson,
            String graphJson,
            String status
    ) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repositoryId = repositoryId;
        this.analysisId = analysisId;
        this.packageCount = packageCount;
        this.classCount = classCount;
        this.interfaceCount = interfaceCount;
        this.dependencyCount = dependencyCount;
        this.cycleCount = cycleCount;
        this.hotspotCount = hotspotCount;
        this.smellCount = smellCount;
        this.averageComplexity = averageComplexity;
        this.averageMaintainability = averageMaintainability;
        this.packageStatsJson = packageStatsJson != null ? packageStatsJson : "[]";
        this.cyclesJson = cyclesJson != null ? cyclesJson : "[]";
        this.hotspotsJson = hotspotsJson != null ? hotspotsJson : "[]";
        this.smellsJson = smellsJson != null ? smellsJson : "[]";
        this.metricsJson = metricsJson != null ? metricsJson : "{}";
        this.graphJson = graphJson != null ? graphJson : "{}";
        this.status = status != null ? status : "COMPLETED";
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

    public int getPackageCount() {
        return packageCount;
    }

    public void setPackageCount(int packageCount) {
        this.packageCount = packageCount;
    }

    public int getClassCount() {
        return classCount;
    }

    public void setClassCount(int classCount) {
        this.classCount = classCount;
    }

    public int getInterfaceCount() {
        return interfaceCount;
    }

    public void setInterfaceCount(int interfaceCount) {
        this.interfaceCount = interfaceCount;
    }

    public int getDependencyCount() {
        return dependencyCount;
    }

    public void setDependencyCount(int dependencyCount) {
        this.dependencyCount = dependencyCount;
    }

    public int getCycleCount() {
        return cycleCount;
    }

    public void setCycleCount(int cycleCount) {
        this.cycleCount = cycleCount;
    }

    public int getHotspotCount() {
        return hotspotCount;
    }

    public void setHotspotCount(int hotspotCount) {
        this.hotspotCount = hotspotCount;
    }

    public int getSmellCount() {
        return smellCount;
    }

    public void setSmellCount(int smellCount) {
        this.smellCount = smellCount;
    }

    public double getAverageComplexity() {
        return averageComplexity;
    }

    public void setAverageComplexity(double averageComplexity) {
        this.averageComplexity = averageComplexity;
    }

    public double getAverageMaintainability() {
        return averageMaintainability;
    }

    public void setAverageMaintainability(double averageMaintainability) {
        this.averageMaintainability = averageMaintainability;
    }

    public String getPackageStatsJson() {
        return packageStatsJson;
    }

    public void setPackageStatsJson(String packageStatsJson) {
        this.packageStatsJson = packageStatsJson;
    }

    public String getCyclesJson() {
        return cyclesJson;
    }

    public void setCyclesJson(String cyclesJson) {
        this.cyclesJson = cyclesJson;
    }

    public String getHotspotsJson() {
        return hotspotsJson;
    }

    public void setHotspotsJson(String hotspotsJson) {
        this.hotspotsJson = hotspotsJson;
    }

    public String getSmellsJson() {
        return smellsJson;
    }

    public void setSmellsJson(String smellsJson) {
        this.smellsJson = smellsJson;
    }

    public String getMetricsJson() {
        return metricsJson;
    }

    public void setMetricsJson(String metricsJson) {
        this.metricsJson = metricsJson;
    }

    public String getGraphJson() {
        return graphJson;
    }

    public void setGraphJson(String graphJson) {
        this.graphJson = graphJson;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
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
        ArchitectureAnalysisEntity that = (ArchitectureAnalysisEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
