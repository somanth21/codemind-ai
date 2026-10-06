package com.codemind.domain.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "repositories")
public class RepositoryEntity {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(name = "source_type", nullable = false, length = 50)
    private String sourceType; // "LOCAL" or "GIT"

    @Column(nullable = false, length = 50)
    private String status = "REGISTERED";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;

    @Column(name = "file_count")
    private int fileCount = 0;

    @Column(name = "total_size_bytes")
    private long totalSizeBytes = 0L;

    @Column(name = "storage_dir_name", length = 255)
    private String storageDirName;

    @Column(name = "ingestion_started_at")
    private Instant ingestionStartedAt;

    @Column(name = "ingestion_completed_at")
    private Instant ingestionCompletedAt;

    @Column(name = "failure_reason", length = 1000)
    private String failureReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public RepositoryEntity() {
    }

    public RepositoryEntity(UUID id, String name, String sourceType, UserEntity owner) {
        this.id = id != null ? id : UUID.randomUUID();
        this.name = name;
        this.sourceType = sourceType;
        this.owner = owner;
        this.status = RepositoryStatus.REGISTERED.name();
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PrePersist
    protected void onCreate() {
        if (id == null) {
            id = UUID.randomUUID();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (updatedAt == null) {
            updatedAt = Instant.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSourceType() {
        return sourceType;
    }

    public void setSourceType(String sourceType) {
        this.sourceType = sourceType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public UserEntity getOwner() {
        return owner;
    }

    public void setOwner(UserEntity owner) {
        this.owner = owner;
    }

    public int getFileCount() {
        return fileCount;
    }

    public void setFileCount(int fileCount) {
        this.fileCount = fileCount;
    }

    public long getTotalSizeBytes() {
        return totalSizeBytes;
    }

    public void setTotalSizeBytes(long totalSizeBytes) {
        this.totalSizeBytes = totalSizeBytes;
    }

    public String getStorageDirName() {
        return storageDirName;
    }

    public void setStorageDirName(String storageDirName) {
        this.storageDirName = storageDirName;
    }

    public Instant getIngestionStartedAt() {
        return ingestionStartedAt;
    }

    public void setIngestionStartedAt(Instant ingestionStartedAt) {
        this.ingestionStartedAt = ingestionStartedAt;
    }

    public Instant getIngestionCompletedAt() {
        return ingestionCompletedAt;
    }

    public void setIngestionCompletedAt(Instant ingestionCompletedAt) {
        this.ingestionCompletedAt = ingestionCompletedAt;
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

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        RepositoryEntity that = (RepositoryEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }
}
