package com.codemind.domain.repository;

import com.codemind.domain.model.RepositoryEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface RepositoryEntityRepository extends JpaRepository<RepositoryEntity, UUID> {
    List<RepositoryEntity> findByOwnerId(UUID ownerId);
}
