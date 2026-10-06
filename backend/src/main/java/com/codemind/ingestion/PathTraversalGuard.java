package com.codemind.ingestion;

import com.codemind.common.exception.CodeMindException;
import org.springframework.stereotype.Component;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Pattern;

/**
 * Path Traversal Guard.
 * Enforces strict canonical path containment and rejects traversal attacks, absolute paths,
 * Windows drive letters, UNC shares, and symbolic links.
 */
@Component
public class PathTraversalGuard {

    private static final Pattern DRIVE_LETTER_PATTERN = Pattern.compile("^[a-zA-Z]:.*");
    private static final Pattern UNC_PATTERN = Pattern.compile("^[/\\\\]{2}.*");

    /**
     * Validates that an archive entry name or relative path is clean and strictly within the sandbox.
     *
     * @param rawEntryName The untrusted entry path from client or ZIP
     * @param sandboxRoot  The canonical sandbox directory
     * @param maxPathLength Maximum allowed path length
     * @param maxFilenameLength Maximum allowed filename length
     * @return The safe, resolved canonical Path inside sandboxRoot
     */
    public Path validateAndResolve(String rawEntryName, Path sandboxRoot, int maxPathLength, int maxFilenameLength) {
        if (rawEntryName == null || rawEntryName.trim().isEmpty()) {
            throw new CodeMindException("Path entry cannot be null or empty");
        }

        if (rawEntryName.length() > maxPathLength) {
            throw new CodeMindException("Path exceeds maximum length of " + maxPathLength + " characters: " + rawEntryName.length());
        }

        String normalizedEntry = rawEntryName.replace('\\', '/').trim();

        // 1. Decode potential URL encoding to prevent %2e%2e%2f evasion
        try {
            String decoded = URLDecoder.decode(normalizedEntry, StandardCharsets.UTF_8);
            if (decoded.contains("..") || decoded.contains("%")) {
                if (containsTraversalSequence(decoded)) {
                    throw new CodeMindException("Encoded path traversal detected in entry: " + rawEntryName);
                }
            }
        } catch (IllegalArgumentException ignored) {
            // If decoding fails, continue checking normalized entry directly
        }

        // 2. Traversal sequences check
        if (containsTraversalSequence(normalizedEntry)) {
            throw new CodeMindException("Path traversal sequence '..' detected in entry: " + rawEntryName);
        }

        // 3. Absolute path checks (Unix / root-relative)
        if (normalizedEntry.startsWith("/")) {
            throw new CodeMindException("Absolute Unix paths are strictly prohibited: " + rawEntryName);
        }

        // 4. Windows drive-letter checks (e.g. C:, D:)
        if (DRIVE_LETTER_PATTERN.matcher(normalizedEntry).matches()) {
            throw new CodeMindException("Windows drive-letter paths are strictly prohibited: " + rawEntryName);
        }

        // 5. Windows UNC path checks (e.g. \\server\share)
        if (UNC_PATTERN.matcher(rawEntryName).matches()) {
            throw new CodeMindException("UNC network paths are strictly prohibited: " + rawEntryName);
        }

        // 6. Filename length check
        String[] segments = normalizedEntry.split("/");
        for (String segment : segments) {
            if (segment.length() > maxFilenameLength) {
                throw new CodeMindException("Filename component exceeds maximum length of " + maxFilenameLength + " characters: " + segment);
            }
        }

        // 7. Canonical containment check
        Path canonicalSandbox = sandboxRoot.toAbsolutePath().normalize();
        Path candidatePath = canonicalSandbox.resolve(normalizedEntry).normalize();

        if (!candidatePath.startsWith(canonicalSandbox)) {
            throw new CodeMindException("Path traversal violation: entry escapes sandbox root boundary");
        }

        return candidatePath;
    }

    /**
     * Verifies that an existing path is within the sandbox root and is not a symbolic link.
     */
    public Path verifyWithinRoot(Path candidatePath, Path rootPath) {
        if (candidatePath == null || rootPath == null) {
            throw new IllegalArgumentException("Paths must not be null");
        }

        Path canonicalRoot = rootPath.toAbsolutePath().normalize();
        Path canonicalCandidate = candidatePath.toAbsolutePath().normalize();

        if (!canonicalCandidate.startsWith(canonicalRoot)) {
            throw new CodeMindException("Path traversal violation detected: path is outside sandbox root");
        }

        if (Files.exists(canonicalCandidate) && Files.isSymbolicLink(canonicalCandidate)) {
            throw new CodeMindException("Symbolic links are strictly prohibited inside the sandbox: " + canonicalCandidate);
        }

        return canonicalCandidate;
    }

    private boolean containsTraversalSequence(String path) {
        return path.equals("..")
                || path.startsWith("../")
                || path.endsWith("/..")
                || path.contains("/../")
                || path.contains("\\..\\")
                || path.contains("/..\\")
                || path.contains("\\../");
    }
}
