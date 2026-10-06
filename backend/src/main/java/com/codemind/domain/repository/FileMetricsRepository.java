package com.codemind.domain.repository;

import com.codemind.domain.model.FileMetricsEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileMetricsRepository extends JpaRepository<FileMetricsEntity, UUID> {
    List<FileMetricsEntity> findByAnalysisId(UUID analysisId);
    Page<FileMetricsEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    Optional<FileMetricsEntity> findByAnalysisIdAndFilePath(UUID analysisId, String filePath);
    long countByAnalysisId(UUID analysisId);
    void deleteByAnalysisId(UUID analysisId);
}
