package com.codemind.domain.repository;

import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.RelationshipType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RelationshipRepository extends JpaRepository<RelationshipEntity, UUID> {
    Page<RelationshipEntity> findByAnalysisId(UUID analysisId, Pageable pageable);
    Page<RelationshipEntity> findByAnalysisIdAndRelationshipType(UUID analysisId, RelationshipType relationshipType, Pageable pageable);
    List<RelationshipEntity> findByAnalysisId(UUID analysisId);
    long countByAnalysisId(UUID analysisId);
    void deleteByAnalysisId(UUID analysisId);
}
