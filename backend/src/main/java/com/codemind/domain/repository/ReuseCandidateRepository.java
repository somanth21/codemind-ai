package com.codemind.domain.repository;

import com.codemind.domain.model.ReuseCandidateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReuseCandidateRepository extends JpaRepository<ReuseCandidateEntity, UUID> {
    List<ReuseCandidateEntity> findByReuseAnalysisIdOrderByOverallScoreDesc(UUID reuseAnalysisId);
    void deleteByReuseAnalysisId(UUID reuseAnalysisId);
}
