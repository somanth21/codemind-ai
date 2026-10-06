package com.codemind.domain.repository;

import com.codemind.domain.model.FindingStatus;
import com.codemind.domain.model.SecurityCategory;
import com.codemind.domain.model.SecurityFindingEntity;
import com.codemind.domain.model.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SecurityFindingRepository extends JpaRepository<SecurityFindingEntity, UUID>, JpaSpecificationExecutor<SecurityFindingEntity> {
    List<SecurityFindingEntity> findByAnalysisId(UUID analysisId);
    List<SecurityFindingEntity> findBySecurityAnalysisId(UUID securityAnalysisId);
    List<SecurityFindingEntity> findByRepositoryId(UUID repositoryId);
    List<SecurityFindingEntity> findByAnalysisIdAndFilePath(UUID analysisId, String filePath);
    List<SecurityFindingEntity> findByRepositoryIdAndFilePath(UUID repositoryId, String filePath);
    Page<SecurityFindingEntity> findByRepositoryIdAndAnalysisId(UUID repositoryId, UUID analysisId, Pageable pageable);
    Page<SecurityFindingEntity> findByRepositoryIdAndAnalysisIdAndSeverity(UUID repositoryId, UUID analysisId, Severity severity, Pageable pageable);
    Page<SecurityFindingEntity> findByRepositoryIdAndAnalysisIdAndCategory(UUID repositoryId, UUID analysisId, SecurityCategory category, Pageable pageable);
    Page<SecurityFindingEntity> findByRepositoryIdAndSecurityAnalysisId(UUID repositoryId, UUID securityAnalysisId, Pageable pageable);
    Page<SecurityFindingEntity> findByRepositoryIdAndSecurityAnalysisIdAndSeverity(UUID repositoryId, UUID securityAnalysisId, Severity severity, Pageable pageable);
    Page<SecurityFindingEntity> findByRepositoryIdAndSecurityAnalysisIdAndCategory(UUID repositoryId, UUID securityAnalysisId, SecurityCategory category, Pageable pageable);
    long countByAnalysisIdAndSeverity(UUID analysisId, Severity severity);
    void deleteByRepositoryId(UUID repositoryId);
}
