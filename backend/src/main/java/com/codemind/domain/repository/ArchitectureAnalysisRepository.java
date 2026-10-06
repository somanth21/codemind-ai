package com.codemind.domain.repository;

import com.codemind.domain.model.ArchitectureAnalysisEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ArchitectureAnalysisRepository extends JpaRepository<ArchitectureAnalysisEntity, UUID> {
    Optional<ArchitectureAnalysisEntity> findByIdAndRepositoryId(UUID id, UUID repositoryId);
    Optional<ArchitectureAnalysisEntity> findFirstByRepositoryIdAndAnalysisIdOrderByCreatedAtDesc(UUID repositoryId, UUID analysisId);
    Optional<ArchitectureAnalysisEntity> findFirstByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    Page<ArchitectureAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId, Pageable pageable);
    List<ArchitectureAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    void deleteByRepositoryId(UUID repositoryId);
}
