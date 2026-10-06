package com.codemind.domain.repository;

import com.codemind.domain.model.ReuseEvidenceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReuseEvidenceRepository extends JpaRepository<ReuseEvidenceEntity, UUID> {
    List<ReuseEvidenceEntity> findByCandidateId(UUID candidateId);
    void deleteByCandidateId(UUID candidateId);
}
