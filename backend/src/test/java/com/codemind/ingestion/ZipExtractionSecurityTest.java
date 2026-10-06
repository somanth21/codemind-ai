package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.junit.jupiter.api.Assertions.*;

class ZipExtractionSecurityTest {

    private ZipExtractionService extractionService;
    private SandboxProperties properties;

    @TempDir
    Path tempSandbox;

    @BeforeEach
    void setUp() {
        properties = new SandboxProperties();
        properties.setRoot(tempSandbox.toString());
        properties.setMaxArchiveSizeBytes(1000000L);
        properties.setMaxExtractedSizeBytes(50000L); // 50 KB for test
        properties.setMaxFileCount(10);
        properties.setMaxDirectoryCount(10);
        properties.setMaxSingleFileSizeBytes(10000L); // 10 KB for test
        properties.setMaxPathLength(500);
        properties.setMaxFilenameLength(255);

        PathTraversalGuard guard = new PathTraversalGuard();
        extractionService = new ZipExtractionService(guard, properties);
    }

    private byte[] createZip(ZipTestEntry... entries) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            for (ZipTestEntry entry : entries) {
                ZipEntry ze = new ZipEntry(entry.name);
                zos.putNextEntry(ze);
                if (entry.content != null) {
                    zos.write(entry.content);
                }
                zos.closeEntry();
            }
        }
        return baos.toByteArray();
    }

    record ZipTestEntry(String name, byte[] content) {
        static ZipTestEntry file(String name, String content) {
            return new ZipTestEntry(name, content.getBytes());
        }
        static ZipTestEntry dir(String name) {
            return new ZipTestEntry(name.endsWith("/") ? name : name + "/", null);
        }
    }

    @Test
    void testExtractNormalZip() throws IOException {
        byte[] zipBytes = createZip(
                ZipTestEntry.file("README.md", "# Test Project"),
                ZipTestEntry.dir("src/"),
                ZipTestEntry.file("src/Main.java", "public class Main {}")
        );

        Path target = tempSandbox.resolve("normal-repo");
        ZipExtractionService.ExtractionResult result = extractionService.extractArchive(
                new ByteArrayInputStream(zipBytes), target
        );

        assertEquals(2, result.fileCount());
        assertTrue(Files.exists(target.resolve("README.md")));
        assertTrue(Files.exists(target.resolve("src/Main.java")));
    }

    @Test
    void testRejectsEmptyZip() {
        byte[] zipBytes = new byte[0];
        Path target = tempSandbox.resolve("empty-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testRejectsInvalidCorruptZip() {
        byte[] corruptBytes = "Not a zip file content at all".getBytes();
        Path target = tempSandbox.resolve("corrupt-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(corruptBytes), target)
        );
    }

    @Test
    void testRejectsZipWithTraversalUnix() throws IOException {
        byte[] zipBytes = createZip(
                ZipTestEntry.file("../escape.txt", "malicious payload")
        );
        Path target = tempSandbox.resolve("traversal-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
        assertFalse(Files.exists(tempSandbox.resolve("escape.txt")));
    }

    @Test
    void testRejectsZipWithTraversalWindows() throws IOException {
        byte[] zipBytes = createZip(
                ZipTestEntry.file("..\\escape-win.txt", "malicious payload")
        );
        Path target = tempSandbox.resolve("traversal-win-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
        assertFalse(Files.exists(tempSandbox.resolve("escape-win.txt")));
    }

    @Test
    void testRejectsDuplicateEntries() throws IOException {
        byte[] zipBytes = createZip(
                ZipTestEntry.file("duplicate.txt", "first version"),
                ZipTestEntry.file("./duplicate.txt", "second version")
        );
        Path target = tempSandbox.resolve("duplicate-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testRejectsAmbiguousFileDirectoryCollision() throws IOException {
        byte[] zipBytes = createZip(
                ZipTestEntry.file("conflict", "I am a file"),
                ZipTestEntry.dir("conflict/")
        );
        Path target = tempSandbox.resolve("collision-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testRejectsOversizedSingleFile() throws IOException {
        byte[] bigContent = new byte[15000]; // 15 KB, exceeds 10 KB limit
        byte[] zipBytes = createZip(
                ZipTestEntry.file("huge.dat", new String(bigContent))
        );
        Path target = tempSandbox.resolve("big-file-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testRejectsZipBombOversizedTotalExtracted() throws IOException {
        // Multiple files whose sum exceeds 50 KB limit
        ZipTestEntry[] entries = new ZipTestEntry[8];
        for (int i = 0; i < 8; i++) {
            entries[i] = new ZipTestEntry("file" + i + ".dat", new byte[8000]); // 8 * 8000 = 64 KB > 50 KB
        }
        byte[] zipBytes = createZip(entries);
        Path target = tempSandbox.resolve("zipbomb-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testRejectsTooManyFiles() throws IOException {
        // 12 files exceeds 10 files limit
        ZipTestEntry[] entries = new ZipTestEntry[12];
        for (int i = 0; i < 12; i++) {
            entries[i] = ZipTestEntry.file("file" + i + ".txt", "small");
        }
        byte[] zipBytes = createZip(entries);
        Path target = tempSandbox.resolve("toomany-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );
    }

    @Test
    void testFailedIngestionCleansUpExtractedFiles() throws IOException {
        // Zip where first file succeeds, but second file causes a traversal violation
        byte[] zipBytes = createZip(
                ZipTestEntry.file("first.txt", "valid content"),
                ZipTestEntry.file("../escape.txt", "evil")
        );
        Path target = tempSandbox.resolve("cleanup-check-repo");

        assertThrows(CodeMindException.class, () ->
                extractionService.extractArchive(new ByteArrayInputStream(zipBytes), target)
        );

        // Verify rollback: target directory must NOT contain first.txt
        assertFalse(Files.exists(target.resolve("first.txt")), "Rollback must remove partially extracted files");
    }
}
