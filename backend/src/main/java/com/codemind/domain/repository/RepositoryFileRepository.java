package com.codemind.domain.repository;

import com.codemind.domain.model.RepositoryFileEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RepositoryFileRepository extends JpaRepository<RepositoryFileEntity, UUID>, JpaSpecificationExecutor<RepositoryFileEntity> {

    List<RepositoryFileEntity> findByRepositoryIdOrderByRelativePathAsc(UUID repositoryId);

    Optional<RepositoryFileEntity> findByRepositoryIdAndRelativePath(UUID repositoryId, String relativePath);

    long countByRepositoryId(UUID repositoryId);

    void deleteByRepositoryId(UUID repositoryId);
}
