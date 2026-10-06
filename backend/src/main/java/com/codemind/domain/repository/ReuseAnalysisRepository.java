package com.codemind.domain.repository;

import com.codemind.domain.model.ReuseAnalysisEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReuseAnalysisRepository extends JpaRepository<ReuseAnalysisEntity, UUID> {
    Optional<ReuseAnalysisEntity> findByIdAndRepositoryId(UUID id, UUID repositoryId);
    List<ReuseAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    Page<ReuseAnalysisEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId, Pageable pageable);
    void deleteByRepositoryId(UUID repositoryId);
}
