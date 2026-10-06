package com.codemind.domain.repository;

import com.codemind.domain.model.SymbolMetricsEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SymbolMetricsRepository extends JpaRepository<SymbolMetricsEntity, UUID> {
    List<SymbolMetricsEntity> findByAnalysisId(UUID analysisId);
    Page<SymbolMetricsEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    Optional<SymbolMetricsEntity> findBySymbolId(UUID symbolId);
    void deleteByAnalysisId(UUID analysisId);
}
