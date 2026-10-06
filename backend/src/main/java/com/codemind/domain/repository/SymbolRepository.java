package com.codemind.domain.repository;

import com.codemind.domain.model.SymbolEntity;
import com.codemind.domain.model.SymbolKind;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SymbolRepository extends JpaRepository<SymbolEntity, UUID> {
    Page<SymbolEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    Page<SymbolEntity> findByAnalysisIdAndKind(UUID analysisId, SymbolKind kind, Pageable pageable);
    List<SymbolEntity> findByAnalysisId(UUID analysisId);
    List<SymbolEntity> findByAnalysisIdAndFilePath(UUID analysisId, String filePath);
    Optional<SymbolEntity> findByAnalysisIdAndFqn(UUID analysisId, String fqn);
    long countByAnalysisId(UUID analysisId);
    long countByAnalysisIdAndKind(UUID analysisId, SymbolKind kind);
    void deleteByAnalysisId(UUID analysisId);
}
