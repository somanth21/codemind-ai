package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class PathTraversalGuardTest {

    private PathTraversalGuard guard;

    @TempDir
    Path tempSandbox;

    @BeforeEach
    void setUp() {
        guard = new PathTraversalGuard();
    }

    @Test
    void testNormalRelativePathResolvesInsideSandbox() {
        Path resolved = guard.validateAndResolve("src/main/App.java", tempSandbox, 500, 255);
        assertNotNull(resolved);
        assertTrue(resolved.startsWith(tempSandbox.toAbsolutePath().normalize()));
        assertTrue(resolved.endsWith("App.java"));
    }

    @Test
    void testRejectsDotDotTraversalUnix() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("../outside.txt", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("src/../../outside.txt", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsDotDotTraversalWindowsBackslash() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("..\\outside.txt", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("src\\..\\..\\outside.txt", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsAbsoluteUnixPath() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("/etc/passwd", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("/var/log/syslog", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsWindowsDriveLetterPath() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("C:\\Windows\\System32\\cmd.exe", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("D:/sensitive/data.txt", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsWindowsUncPath() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("\\\\attacker-server\\share\\malware.exe", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("//10.0.0.1/share/payload", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsUrlEncodedTraversal() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("%2e%2e%2foutside.txt", tempSandbox, 500, 255));

        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("src/%2e%2e/file.txt", tempSandbox, 500, 255));
    }

    @Test
    void testRejectsExcessivePathLength() {
        String longPath = "a/".repeat(300) + "file.java";
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve(longPath, tempSandbox, 100, 255));
    }

    @Test
    void testRejectsExcessiveFilenameLength() {
        String longFilename = "a".repeat(256) + ".java";
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve(longFilename, tempSandbox, 500, 50));
    }

    @Test
    void testRejectsNullOrEmptyPath() {
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve(null, tempSandbox, 500, 255));
        assertThrows(CodeMindException.class, () ->
                guard.validateAndResolve("   ", tempSandbox, 500, 255));
    }
}
