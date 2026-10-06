package com.codemind.ingestion;

import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.RepositoryFileEntity;
import com.codemind.domain.repository.RepositoryFileRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

/**
 * Scans an extracted sandbox repository directory and captures structural metadata:
 * path, filename, extension, language, size, binary status, and SHA-256 hash.
 */
@Service
public class FileMetadataScanner {

    private static final Logger log = LoggerFactory.getLogger(FileMetadataScanner.class);

    private final LanguageClassifier languageClassifier;
    private final BinaryDetector binaryDetector;
    private final RepositoryFileRepository repositoryFileRepository;

    public FileMetadataScanner(
            LanguageClassifier languageClassifier,
            BinaryDetector binaryDetector,
            RepositoryFileRepository repositoryFileRepository
    ) {
        this.languageClassifier = languageClassifier;
        this.binaryDetector = binaryDetector;
        this.repositoryFileRepository = repositoryFileRepository;
    }

    public List<RepositoryFileEntity> scanAndPersist(RepositoryEntity repository, Path sourceRoot) {
        List<RepositoryFileEntity> fileEntities = new ArrayList<>();

        try (Stream<Path> pathStream = Files.walk(sourceRoot)) {
            List<Path> regularFiles = pathStream.filter(Files::isRegularFile).toList();

            for (Path filePath : regularFiles) {
                Path relative = sourceRoot.relativize(filePath);
                String normalizedRelPath = relative.toString().replace('\\', '/');
                String fileName = filePath.getFileName().toString();
                String extension = languageClassifier.extractExtension(fileName);
                String language = languageClassifier.classify(fileName);
                long size = Files.size(filePath);
                boolean binary = binaryDetector.isBinary(filePath);
                String sha256 = computeSha256(filePath);

                RepositoryFileEntity entity = new RepositoryFileEntity(
                        UUID.randomUUID(),
                        repository,
                        normalizedRelPath,
                        fileName,
                        extension,
                        language,
                        size,
                        binary,
                        sha256
                );
                fileEntities.add(entity);
            }

            repositoryFileRepository.saveAll(fileEntities);
            log.info("Scanned and indexed {} files for repository {}", fileEntities.size(), repository.getId());
        } catch (Exception e) {
            log.error("Failed to scan metadata for repository {}: {}", repository.getId(), e.getMessage());
            throw new RuntimeException("File metadata scanning failed: " + e.getMessage(), e);
        }

        return fileEntities;
    }

    private String computeSha256(Path filePath) {
        try (InputStream in = new BufferedInputStream(Files.newInputStream(filePath))) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = in.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (Exception e) {
            log.warn("Failed to compute SHA-256 for file {}: {}", filePath, e.getMessage());
            return null;
        }
    }
}
