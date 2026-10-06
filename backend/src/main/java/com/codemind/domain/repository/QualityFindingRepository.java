package com.codemind.domain.repository;

import com.codemind.domain.model.QualityFindingEntity;
import com.codemind.domain.model.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface QualityFindingRepository extends JpaRepository<QualityFindingEntity, UUID> {
    List<QualityFindingEntity> findByAnalysisId(UUID analysisId);
    Page<QualityFindingEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    Page<QualityFindingEntity> findByAnalysisIdAndSeverity(UUID analysisId, Severity severity, Pageable pageable);
    Page<QualityFindingEntity> findByAnalysisIdAndRuleId(UUID analysisId, String ruleId, Pageable pageable);
    long countByAnalysisId(UUID analysisId);
    long countByAnalysisIdAndSeverity(UUID analysisId, Severity severity);
    void deleteByAnalysisId(UUID analysisId);
}
