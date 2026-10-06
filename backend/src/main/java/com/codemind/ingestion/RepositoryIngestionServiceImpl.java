package com.codemind.ingestion;

import com.codemind.audit.service.AuditService;
import com.codemind.common.exception.CodeMindException;
import com.codemind.common.exception.ForbiddenException;
import com.codemind.common.exception.ResourceNotFoundException;
import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.RepositoryFileEntity;
import com.codemind.domain.model.RepositoryStatus;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.RepositoryEntityRepository;
import com.codemind.domain.repository.RepositoryFileRepository;
import com.codemind.ingestion.dto.RepositoryTreeNodeDto;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class RepositoryIngestionServiceImpl implements RepositoryIngestionService {

    private static final Logger log = LoggerFactory.getLogger(RepositoryIngestionServiceImpl.class);

    private final RepositoryEntityRepository repositoryEntityRepository;
    private final RepositoryFileRepository repositoryFileRepository;
    private final ZipExtractionService zipExtractionService;
    private final FileMetadataScanner fileMetadataScanner;
    private final RepositoryTreeService repositoryTreeService;
    private final PathTraversalGuard pathTraversalGuard;
    private final BinaryDetector binaryDetector;
    private final SandboxProperties properties;
    private final AuditService auditService;
    private final GitHubUrlValidator gitHubUrlValidator;
    private final GitHubIngestionService gitHubIngestionService;

    public RepositoryIngestionServiceImpl(
            RepositoryEntityRepository repositoryEntityRepository,
            RepositoryFileRepository repositoryFileRepository,
            ZipExtractionService zipExtractionService,
            FileMetadataScanner fileMetadataScanner,
            RepositoryTreeService repositoryTreeService,
            PathTraversalGuard pathTraversalGuard,
            BinaryDetector binaryDetector,
            SandboxProperties properties,
            AuditService auditService,
            GitHubUrlValidator gitHubUrlValidator,
            GitHubIngestionService gitHubIngestionService
    ) {
        this.repositoryEntityRepository = repositoryEntityRepository;
        this.repositoryFileRepository = repositoryFileRepository;
        this.zipExtractionService = zipExtractionService;
        this.fileMetadataScanner = fileMetadataScanner;
        this.repositoryTreeService = repositoryTreeService;
        this.pathTraversalGuard = pathTraversalGuard;
        this.binaryDetector = binaryDetector;
        this.properties = properties;
        this.auditService = auditService;
        this.gitHubUrlValidator = gitHubUrlValidator;
        this.gitHubIngestionService = gitHubIngestionService;
    }

    @Override
    @Transactional
    public RepositoryEntity registerAndIngest(String name, InputStream archiveStream, long archiveSizeBytes, UserEntity owner) {
        if (owner.getRole() == Role.ROLE_AUDITOR) {
            throw new ForbiddenException("Auditor role is read-only and cannot ingest repositories");
        }

        if (archiveSizeBytes > properties.getMaxArchiveSizeBytes()) {
            throw new CodeMindException("Compressed archive size (" + archiveSizeBytes + " bytes) exceeds maximum limit of " + properties.getMaxArchiveSizeBytes() + " bytes");
        }

        if (name == null || name.trim().isEmpty()) {
            throw new CodeMindException("Repository name cannot be blank");
        }

        UUID repoId = UUID.randomUUID();
        String storageDirName = repoId.toString();
        Path repoSandboxDir = getRepoSandboxRoot(storageDirName);
        Path sourceDir = repoSandboxDir.resolve("source");
        Path metadataDir = repoSandboxDir.resolve("metadata");

        String correlationId = MDC.get("correlationId");

        RepositoryEntity entity = new RepositoryEntity();
        entity.setId(repoId);
        entity.setName(name.trim());
        entity.setSourceType("LOCAL_ZIP");
        entity.setStatus(RepositoryStatus.INGESTING.name());
        entity.setOwner(owner);
        entity.setStorageDirName(storageDirName);
        entity.setIngestionStartedAt(Instant.now());
        entity = repositoryEntityRepository.save(entity);

        auditService.logEvent(
                owner.getEmail(),
                "REPO_REGISTERED",
                "SUCCESS",
                null,
                correlationId,
                "Registered repository: " + entity.getName() + " [id=" + repoId + "]"
        );

        try {
            Files.createDirectories(sourceDir);
            Files.createDirectories(metadataDir);

            // Extract archive under strict resource & traversal limits
            ZipExtractionService.ExtractionResult result = zipExtractionService.extractArchive(archiveStream, sourceDir);

            // Scan extracted files and build database metadata
            List<RepositoryFileEntity> scannedFiles = fileMetadataScanner.scanAndPersist(entity, sourceDir);

            entity.setStatus(RepositoryStatus.READY.name());
            entity.setFileCount(scannedFiles.size());
            entity.setTotalSizeBytes(result.totalBytesExtracted());
            entity.setIngestionCompletedAt(Instant.now());
            entity = repositoryEntityRepository.save(entity);

            auditService.logEvent(
                    owner.getEmail(),
                    "INGESTION_COMPLETED",
                    "SUCCESS",
                    null,
                    correlationId,
                    "Successfully ingested " + scannedFiles.size() + " files (" + result.totalBytesExtracted() + " bytes)"
            );

            return entity;
        } catch (Exception e) {
            log.error("Failed ingestion for repository {}: {}", repoId, e.getMessage());

            entity.setStatus(RepositoryStatus.FAILED.name());
            entity.setFailureReason(e.getMessage() != null && e.getMessage().length() > 950 ? e.getMessage().substring(0, 950) : e.getMessage());
            entity.setIngestionCompletedAt(Instant.now());
            repositoryEntityRepository.save(entity);

            // Guaranteed clean rollback of sandbox directory on failure
            zipExtractionService.safeDeleteRecursively(repoSandboxDir);

            auditService.logEvent(
                    owner.getEmail(),
                    "INGESTION_FAILED",
                    "FAILURE",
                    null,
                    correlationId,
                    "Failed ingestion: " + e.getMessage()
            );

            if (e instanceof CodeMindException) {
                throw (CodeMindException) e;
            }
            throw new CodeMindException("Repository ingestion failed: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public RepositoryEntity ingestFromGitHub(String githubUrl, String requestedBranch, UserEntity owner) {
        if (owner.getRole() == Role.ROLE_AUDITOR) {
            throw new ForbiddenException("Auditor role is read-only and cannot ingest repositories");
        }

        GitHubUrlValidator.ValidatedGitHubRepo validatedRepo = gitHubUrlValidator.validateAndParse(githubUrl, requestedBranch);

        UUID repoId = UUID.randomUUID();
        String storageDirName = repoId.toString();
        Path repoSandboxDir = getRepoSandboxRoot(storageDirName);
        Path sourceDir = repoSandboxDir.resolve("source");
        Path metadataDir = repoSandboxDir.resolve("metadata");

        String correlationId = MDC.get("correlationId");

        RepositoryEntity entity = new RepositoryEntity();
        entity.setId(repoId);
        entity.setName(validatedRepo.getFullName());
        entity.setSourceType("GITHUB");
        entity.setStatus(RepositoryStatus.INGESTING.name());
        entity.setOwner(owner);
        entity.setStorageDirName(storageDirName);
        entity.setIngestionStartedAt(Instant.now());
        entity = repositoryEntityRepository.save(entity);

        auditService.logEvent(
                owner.getEmail(),
                "GITHUB_REPO_REGISTERED",
                "SUCCESS",
                null,
                correlationId,
                "Registered GitHub repository: " + entity.getName() + " [id=" + repoId + "]"
        );

        try (GitHubIngestionService.DownloadedArchive archive = gitHubIngestionService.fetchArchiveStream(validatedRepo)) {
            Files.createDirectories(sourceDir);
            Files.createDirectories(metadataDir);

            // Extract archive under strict resource & traversal limits
            ZipExtractionService.ExtractionResult result = zipExtractionService.extractArchive(archive.stream(), sourceDir);

            // Scan extracted files and build database metadata
            List<RepositoryFileEntity> scannedFiles = fileMetadataScanner.scanAndPersist(entity, sourceDir);

            entity.setStatus(RepositoryStatus.READY.name());
            entity.setFileCount(scannedFiles.size());
            entity.setTotalSizeBytes(result.totalBytesExtracted());
            entity.setIngestionCompletedAt(Instant.now());
            entity = repositoryEntityRepository.save(entity);

            auditService.logEvent(
                    owner.getEmail(),
                    "GITHUB_INGESTION_COMPLETED",
                    "SUCCESS",
                    null,
                    correlationId,
                    "Successfully ingested GitHub repo " + validatedRepo.getFullName() + " (" + scannedFiles.size() + " files, " + result.totalBytesExtracted() + " bytes)"
            );

            return entity;
        } catch (Exception e) {
            log.error("Failed GitHub ingestion for repository {}: {}", repoId, e.getMessage());

            entity.setStatus(RepositoryStatus.FAILED.name());
            entity.setFailureReason(e.getMessage() != null && e.getMessage().length() > 950 ? e.getMessage().substring(0, 950) : e.getMessage());
            entity.setIngestionCompletedAt(Instant.now());
            repositoryEntityRepository.save(entity);

            // Guaranteed clean rollback of sandbox directory on failure
            zipExtractionService.safeDeleteRecursively(repoSandboxDir);

            auditService.logEvent(
                    owner.getEmail(),
                    "GITHUB_INGESTION_FAILED",
                    "FAILURE",
                    null,
                    correlationId,
                    "Failed GitHub ingestion: " + e.getMessage()
            );

            if (e instanceof CodeMindException) {
                throw (CodeMindException) e;
            }
            throw new CodeMindException("GitHub repository ingestion failed: " + e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public RepositoryEntity getRepository(UUID repositoryId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));

        validateAccess(repo, requester);
        return repo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RepositoryEntity> listRepositories(UserEntity requester) {
        if (requester.getRole() == Role.ROLE_ADMIN) {
            return repositoryEntityRepository.findAll();
        }
        return repositoryEntityRepository.findByOwnerId(requester.getId());
    }

    @Override
    @Transactional
    public void deleteRepository(UUID repositoryId, UserEntity requester) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));

        validateOwnerOrAdmin(repo, requester);

        String correlationId = MDC.get("correlationId");

        // 1. Delete DB records
        repositoryFileRepository.deleteByRepositoryId(repositoryId);
        repositoryEntityRepository.delete(repo);

        // 2. Safe deletion of sandbox directory
        if (repo.getStorageDirName() != null) {
            Path repoSandboxDir = getRepoSandboxRoot(repo.getStorageDirName());
            zipExtractionService.safeDeleteRecursively(repoSandboxDir);
        }

        auditService.logEvent(
                requester.getEmail(),
                "REPO_DELETED",
                "SUCCESS",
                null,
                correlationId,
                "Deleted repository: " + repo.getName() + " [id=" + repositoryId + "]"
        );
    }

    @Override
    @Transactional(readOnly = true)
    public RepositoryTreeNodeDto getRepositoryTree(UUID repositoryId, UserEntity requester) {
        RepositoryEntity repo = getRepository(repositoryId, requester);
        if (!RepositoryStatus.READY.name().equals(repo.getStatus())) {
            throw new CodeMindException("Repository tree is only available when status is READY (current: " + repo.getStatus() + ")");
        }
        return repositoryTreeService.buildTree(repositoryId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<RepositoryFileEntity> getRepositoryFiles(
            UUID repositoryId,
            String language,
            String extension,
            Boolean binary,
            String pathPrefix,
            Pageable pageable,
            UserEntity requester
    ) {
        RepositoryEntity repo = getRepository(repositoryId, requester);

        Specification<RepositoryFileEntity> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("repository").get("id"), repo.getId()));

            if (language != null && !language.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("language")), language.trim().toLowerCase()));
            }
            if (extension != null && !extension.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("extension")), extension.trim().toLowerCase()));
            }
            if (binary != null) {
                predicates.add(cb.equal(root.get("binary"), binary));
            }
            if (pathPrefix != null && !pathPrefix.trim().isEmpty()) {
                predicates.add(cb.like(root.get("relativePath"), pathPrefix.trim() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return repositoryFileRepository.findAll(spec, pageable);
    }

    @Override
    @Transactional(readOnly = true)
    public String getFileContent(UUID repositoryId, String relativePath, UserEntity requester) {
        RepositoryEntity repo = getRepository(repositoryId, requester);

        if (!RepositoryStatus.READY.name().equals(repo.getStatus())) {
            throw new CodeMindException("Repository files can only be accessed when status is READY");
        }

        Path sourceRoot = getSandboxSourcePath(repositoryId);

        // Security check on candidate path
        Path targetFile = pathTraversalGuard.validateAndResolve(
                relativePath,
                sourceRoot,
                properties.getMaxPathLength(),
                properties.getMaxFilenameLength()
        );

        if (!Files.exists(targetFile) || !Files.isRegularFile(targetFile)) {
            throw new ResourceNotFoundException("File", relativePath);
        }

        try {
            long size = Files.size(targetFile);
            if (size > properties.getMaxContentReadBytes()) {
                throw new CodeMindException("File content exceeds maximum viewable size of " + properties.getMaxContentReadBytes() + " bytes");
            }

            if (binaryDetector.isBinary(targetFile)) {
                throw new CodeMindException("Binary files cannot be displayed as plain text");
            }

            return Files.readString(targetFile, StandardCharsets.UTF_8);
        } catch (Exception e) {
            if (e instanceof CodeMindException) {
                throw (CodeMindException) e;
            }
            throw new CodeMindException("Failed to read file content: " + e.getMessage(), e);
        }
    }

    @Override
    public Path getSandboxSourcePath(UUID repositoryId) {
        RepositoryEntity repo = repositoryEntityRepository.findById(repositoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Repository", repositoryId));
        return getRepoSandboxRoot(repo.getStorageDirName()).resolve("source");
    }

    private Path getRepoSandboxRoot(String storageDirName) {
        Path root = properties.getRootPath();
        return root.resolve("repositories").resolve(storageDirName);
    }

    private void validateAccess(RepositoryEntity repo, UserEntity requester) {
        if (requester.getRole() == Role.ROLE_ADMIN) {
            return;
        }
        if (requester.getRole() == Role.ROLE_AUDITOR) {
            // Auditor can read all repositories
            return;
        }
        if (!repo.getOwner().getId().equals(requester.getId())) {
            auditService.logEvent(
                    requester.getEmail(),
                    "UNAUTHORIZED_ACCESS",
                    "WARNING",
                    null,
                    MDC.get("correlationId"),
                    "User attempted to access unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to view this repository");
        }
    }

    private void validateOwnerOrAdmin(RepositoryEntity repo, UserEntity requester) {
        if (requester.getRole() == Role.ROLE_ADMIN) {
            return;
        }
        if (!repo.getOwner().getId().equals(requester.getId())) {
            auditService.logEvent(
                    requester.getEmail(),
                    "UNAUTHORIZED_ACCESS",
                    "WARNING",
                    null,
                    MDC.get("correlationId"),
                    "User attempted to delete unauthorized repository: " + repo.getId()
            );
            throw new ForbiddenException("You are not authorized to delete this repository");
        }
    }
}
