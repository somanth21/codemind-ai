package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "analysis_runs")
public class AnalysisRunEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private RepositoryEntity repository;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private AnalysisStatus status = AnalysisStatus.NOT_ANALYZED;

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "files_analyzed")
    private int filesAnalyzed = 0;

    @Column(name = "files_skipped")
    private int filesSkipped = 0;

    @Column(name = "error_count")
    private int errorCount = 0;

    @Column(name = "warning_count")
    private int warningCount = 0;

    @Column(name = "total_loc")
    private long totalLoc = 0L;

    @Column(name = "total_classes")
    private int totalClasses = 0;

    @Column(name = "total_methods")
    private int totalMethods = 0;

    @Column(name = "average_complexity")
    private double averageComplexity = 0.0;

    @Column(name = "maintainability_index")
    private double maintainabilityIndex = 0.0;

    @Column(name = "failure_reason", length = 1000)
    private String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public AnalysisRunEntity() {
    }

    public AnalysisRunEntity(UUID id, RepositoryEntity repository, AnalysisStatus status, Instant startedAt) {
        this.id = id != null ? id : UUID.randomUUID();
        this.repository = repository;
        this.status = status != null ? status : AnalysisStatus.NOT_ANALYZED;
        this.startedAt = startedAt != null ? startedAt : Instant.now();
        this.createdAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (startedAt == null) {
            startedAt = Instant.now();
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

    public RepositoryEntity getRepository() {
        return repository;
    }

    public void setRepository(RepositoryEntity repository) {
        this.repository = repository;
    }

    public AnalysisStatus getStatus() {
        return status;
    }

    public void setStatus(AnalysisStatus status) {
        this.status = status;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public int getFilesAnalyzed() {
        return filesAnalyzed;
    }

    public void setFilesAnalyzed(int filesAnalyzed) {
        this.filesAnalyzed = filesAnalyzed;
    }

    public int getFilesSkipped() {
        return filesSkipped;
    }

    public void setFilesSkipped(int filesSkipped) {
        this.filesSkipped = filesSkipped;
    }

    public int getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(int errorCount) {
        this.errorCount = errorCount;
    }

    public int getWarningCount() {
        return warningCount;
    }

    public void setWarningCount(int warningCount) {
        this.warningCount = warningCount;
    }

    public long getTotalLoc() {
        return totalLoc;
    }

    public void setTotalLoc(long totalLoc) {
        this.totalLoc = totalLoc;
    }

    public int getTotalClasses() {
        return totalClasses;
    }

    public void setTotalClasses(int totalClasses) {
        this.totalClasses = totalClasses;
    }

    public int getTotalMethods() {
        return totalMethods;
    }

    public void setTotalMethods(int totalMethods) {
        this.totalMethods = totalMethods;
    }

    public double getAverageComplexity() {
        return averageComplexity;
    }

    public void setAverageComplexity(double averageComplexity) {
        this.averageComplexity = averageComplexity;
    }

    public double getMaintainabilityIndex() {
        return maintainabilityIndex;
    }

    public void setMaintainabilityIndex(double maintainabilityIndex) {
        this.maintainabilityIndex = maintainabilityIndex;
    }

    public String getFailureReason() {
        return failureReason;
    }

    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
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
        AnalysisRunEntity that = (AnalysisRunEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
