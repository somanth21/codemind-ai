package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.file.*;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Secure ZIP Extraction Engine with Zip Bomb & Resource Exhaustion Defense.
 * Evaluates limits on every byte streamed and guarantees clean rollback on constraint violations.
 */
@Service
public class ZipExtractionService {

    private static final Logger log = LoggerFactory.getLogger(ZipExtractionService.class);
    private final PathTraversalGuard pathTraversalGuard;
    private final SandboxProperties properties;

    public ZipExtractionService(PathTraversalGuard pathTraversalGuard, SandboxProperties properties) {
        this.pathTraversalGuard = pathTraversalGuard;
        this.properties = properties;
    }

    public ExtractionResult extractArchive(InputStream archiveStream, Path targetSourceDir) throws IOException {
        long totalBytesExtracted = 0L;
        int fileCount = 0;
        int dirCount = 0;
        Set<String> seenEntriesNormalized = new HashSet<>();

        Files.createDirectories(targetSourceDir);

        try (ZipInputStream zis = new ZipInputStream(new BufferedInputStream(archiveStream))) {
            ZipEntry entry;
            boolean hasAtLeastOneEntry = false;

            while ((entry = zis.getNextEntry()) != null) {
                hasAtLeastOneEntry = true;
                String rawName = entry.getName();

                if (rawName == null || rawName.trim().isEmpty()) {
                    continue;
                }

                // Guard against path traversal, absolute paths, drive letters, UNC paths
                Path resolvedPath = pathTraversalGuard.validateAndResolve(
                        rawName,
                        targetSourceDir,
                        properties.getMaxPathLength(),
                        properties.getMaxFilenameLength()
                );

                String normalizedLookup = targetSourceDir.relativize(resolvedPath).toString().replace('\\', '/').toLowerCase(Locale.ROOT);

                if (entry.isDirectory()) {
                    dirCount++;
                    if (dirCount > properties.getMaxDirectoryCount()) {
                        throw new CodeMindException("Archive exceeds maximum directory count limit of " + properties.getMaxDirectoryCount());
                    }

                    if (seenEntriesNormalized.contains(normalizedLookup) && Files.isRegularFile(resolvedPath)) {
                        throw new CodeMindException("Ambiguous archive collision: directory matches existing file entry: " + rawName);
                    }

                    seenEntriesNormalized.add(normalizedLookup);
                    Files.createDirectories(resolvedPath);
                } else {
                    fileCount++;
                    if (fileCount > properties.getMaxFileCount()) {
                        throw new CodeMindException("Archive exceeds maximum file count limit of " + properties.getMaxFileCount());
                    }

                    if (seenEntriesNormalized.contains(normalizedLookup)) {
                        throw new CodeMindException("Duplicate archive entry detected: " + rawName);
                    }

                    if (Files.isDirectory(resolvedPath)) {
                        throw new CodeMindException("Ambiguous archive collision: file matches existing directory: " + rawName);
                    }

                    seenEntriesNormalized.add(normalizedLookup);

                    // Ensure parent directory exists
                    if (resolvedPath.getParent() != null) {
                        Files.createDirectories(resolvedPath.getParent());
                    }

                    // Extract file content with per-file and total size bounding
                    long fileBytes = extractFileContent(zis, resolvedPath, properties.getMaxSingleFileSizeBytes());
                    totalBytesExtracted += fileBytes;

                    if (totalBytesExtracted > properties.getMaxExtractedSizeBytes()) {
                        throw new CodeMindException("Archive exceeds maximum total extracted size of " + properties.getMaxExtractedSizeBytes() + " bytes (Zip Bomb defense triggered)");
                    }
                }

                zis.closeEntry();
            }

            if (!hasAtLeastOneEntry) {
                throw new CodeMindException("Archive is empty or contains no valid files");
            }
        } catch (Exception ex) {
            log.warn("Extraction failed, rolling back extracted files in {}: {}", targetSourceDir, ex.getMessage());
            safeDeleteRecursively(targetSourceDir);
            if (ex instanceof CodeMindException) {
                throw (CodeMindException) ex;
            }
            throw new CodeMindException("Failed to safely extract archive: " + ex.getMessage(), ex);
        }

        return new ExtractionResult(fileCount, dirCount, totalBytesExtracted);
    }

    private long extractFileContent(ZipInputStream zis, Path destination, long maxSingleFileSize) throws IOException {
        long bytesWritten = 0L;
        byte[] buffer = new byte[8192];

        try (OutputStream out = new BufferedOutputStream(Files.newOutputStream(destination, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING, StandardOpenOption.WRITE))) {
            int len;
            while ((len = zis.read(buffer)) > 0) {
                bytesWritten += len;
                if (bytesWritten > maxSingleFileSize) {
                    throw new CodeMindException("Individual file exceeds maximum allowed size of " + maxSingleFileSize + " bytes: " + destination.getFileName());
                }
                out.write(buffer, 0, len);
            }
        }

        return bytesWritten;
    }

    public void safeDeleteRecursively(Path rootPath) {
        if (rootPath == null || !Files.exists(rootPath)) {
            return;
        }
        try {
            // Verify path is within configured sandbox before deletion
            pathTraversalGuard.verifyWithinRoot(rootPath, properties.getRootPath());

            try (var stream = Files.walk(rootPath)) {
                stream.sorted((a, b) -> b.compareTo(a)) // reverse order to delete children before parents
                        .forEach(p -> {
                            try {
                                Files.deleteIfExists(p);
                            } catch (IOException e) {
                                log.warn("Failed to delete path during cleanup: {}", p);
                            }
                        });
            }
        } catch (Exception e) {
            log.error("Safe cleanup error on {}: {}", rootPath, e.getMessage());
        }
    }

    public record ExtractionResult(int fileCount, int directoryCount, long totalBytesExtracted) {}
}
