package com.codemind.domain.repository;

import com.codemind.domain.model.AnalysisRunEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AnalysisRunRepository extends JpaRepository<AnalysisRunEntity, UUID> {
    List<AnalysisRunEntity> findByRepositoryIdOrderByStartedAtDesc(UUID repositoryId);
    Page<AnalysisRunEntity> findByRepositoryIdOrderByStartedAtDesc(UUID repositoryId, Pageable pageable);
    Optional<AnalysisRunEntity> findFirstByRepositoryIdOrderByStartedAtDesc(UUID repositoryId);
    Optional<AnalysisRunEntity> findByIdAndRepositoryId(UUID id, UUID repositoryId);
    void deleteByRepositoryId(UUID repositoryId);
}
