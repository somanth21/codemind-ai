package com.codemind.ingestion;

import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.RepositoryFileEntity;
import com.codemind.domain.model.UserEntity;
import com.codemind.ingestion.dto.RepositoryTreeNodeDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.io.InputStream;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

public interface RepositoryIngestionService {

    RepositoryEntity registerAndIngest(String name, InputStream archiveStream, long archiveSizeBytes, UserEntity owner);

    RepositoryEntity ingestFromGitHub(String githubUrl, String requestedBranch, UserEntity owner);

    RepositoryEntity getRepository(UUID repositoryId, UserEntity requester);

    List<RepositoryEntity> listRepositories(UserEntity requester);

    void deleteRepository(UUID repositoryId, UserEntity requester);

    Path getSandboxSourcePath(UUID repositoryId);

    RepositoryTreeNodeDto getRepositoryTree(UUID repositoryId, UserEntity requester);

    Page<RepositoryFileEntity> getRepositoryFiles(
            UUID repositoryId,
            String language,
            String extension,
            Boolean binary,
            String pathPrefix,
            Pageable pageable,
            UserEntity requester
    );

    String getFileContent(UUID repositoryId, String relativePath, UserEntity requester);
}
