package com.codemind.domain.repository;

import com.codemind.domain.model.AiReasoningRequestEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AiReasoningRequestRepository extends JpaRepository<AiReasoningRequestEntity, UUID> {
    Optional<AiReasoningRequestEntity> findByIdAndRepositoryId(UUID id, UUID repositoryId);
    List<AiReasoningRequestEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId);
    Page<AiReasoningRequestEntity> findByRepositoryIdOrderByCreatedAtDesc(UUID repositoryId, Pageable pageable);
    Optional<AiReasoningRequestEntity> findFirstByReuseAnalysisIdOrderByCreatedAtDesc(UUID reuseAnalysisId);
    void deleteByRepositoryId(UUID repositoryId);
}
