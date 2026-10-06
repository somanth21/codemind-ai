package com.codemind.ingestion;

import org.springframework.stereotype.Component;

import java.io.BufferedInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

/**
 * Conservative Binary File Detector.
 * Combines known binary extensions with byte inspection (NUL byte scanning and non-text control character ratios).
 */
@Component
public class BinaryDetector {

    private static final int SAMPLE_SIZE = 8192;
    private static final Set<String> KNOWN_BINARY_EXTENSIONS = Set.of(
            "class", "jar", "war", "ear", "zip", "tar", "gz", "7z", "rar",
            "exe", "dll", "so", "dylib", "bin", "o", "obj", "pyc", "pyo",
            "png", "jpg", "jpeg", "gif", "ico", "webp", "bmp", "tiff", "svgz",
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "mp3", "mp4", "wav", "avi", "mov", "flac", "ogg",
            "ttf", "otf", "woff", "woff2", "eot"
    );

    public boolean isBinary(Path filePath) {
        if (filePath == null || !Files.isRegularFile(filePath)) {
            return false;
        }

        String fileName = filePath.getFileName().toString().toLowerCase(Locale.ROOT);
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot < fileName.length() - 1) {
            String ext = fileName.substring(lastDot + 1);
            if (KNOWN_BINARY_EXTENSIONS.contains(ext)) {
                return true;
            }
        }

        try (InputStream in = new BufferedInputStream(Files.newInputStream(filePath))) {
            return isBinaryStream(in);
        } catch (IOException e) {
            // Conservative fallback: treat unreadable files as binary to avoid risky parsing
            return true;
        }
    }

    public boolean isBinaryStream(InputStream in) throws IOException {
        byte[] buffer = new byte[SAMPLE_SIZE];
        int bytesRead = in.read(buffer, 0, SAMPLE_SIZE);
        if (bytesRead <= 0) {
            return false; // Empty file is considered text
        }

        int nonPrintableCount = 0;
        for (int i = 0; i < bytesRead; i++) {
            byte b = buffer[i];

            // In text files, NUL bytes (0x00) should never occur
            if (b == 0) {
                return true;
            }

            // Check for control characters outside CR (13), LF (10), TAB (9), FormFeed (12), Backspace (8)
            int unsignedByte = b & 0xFF;
            if (unsignedByte < 32 && unsignedByte != 9 && unsignedByte != 10 && unsignedByte != 13 && unsignedByte != 12) {
                nonPrintableCount++;
            }
        }

        // If more than 10% of characters in sample are control chars, classify as binary
        return ((double) nonPrintableCount / bytesRead) > 0.10;
    }
}
