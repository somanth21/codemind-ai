package com.codemind.domain.repository;

import com.codemind.domain.model.SecretFindingEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecretFindingRepository extends JpaRepository<SecretFindingEntity, UUID> {
    List<SecretFindingEntity> findByAnalysisId(UUID analysisId);
    Page<SecretFindingEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    long countByAnalysisId(UUID analysisId);
    void deleteByAnalysisId(UUID analysisId);
}
