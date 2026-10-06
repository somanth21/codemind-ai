package com.codemind.domain.repository;

import com.codemind.domain.model.SecurityAnalysisEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SecurityAnalysisRepository extends JpaRepository<SecurityAnalysisEntity, UUID> {
    Optional<SecurityAnalysisEntity> findByIdAndRepositoryId(UUID id, UUID repositoryId);
    Optional<SecurityAnalysisEntity> findFirstByRepositoryIdAndAnalysisIdOrderByCreatedAtDesc(UUID repositoryId, UUID analysisId);
    Optional<SecurityAnalysisEntity> findFirstByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    Page<SecurityAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId, Pageable pageable);
    List<SecurityAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    void deleteByRepositoryId(UUID repositoryId);
}
