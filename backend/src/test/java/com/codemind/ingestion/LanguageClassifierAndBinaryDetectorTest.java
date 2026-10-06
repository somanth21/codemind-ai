package com.codemind.ingestion;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.*;

class LanguageClassifierAndBinaryDetectorTest {

    private final LanguageClassifier languageClassifier = new LanguageClassifier();
    private final BinaryDetector binaryDetector = new BinaryDetector();

    @TempDir
    Path tempDir;

    @Test
    void testLanguageClassificationAllRequiredLanguages() {
        assertEquals("Java", languageClassifier.classify("Main.java"));
        assertEquals("JavaScript", languageClassifier.classify("app.js"));
        assertEquals("JavaScript", languageClassifier.classify("module.mjs"));
        assertEquals("TypeScript", languageClassifier.classify("index.ts"));
        assertEquals("TSX", languageClassifier.classify("Component.tsx"));
        assertEquals("Python", languageClassifier.classify("script.py"));
        assertEquals("C", languageClassifier.classify("kernel.c"));
        assertEquals("C", languageClassifier.classify("header.h"));
        assertEquals("C++", languageClassifier.classify("engine.cpp"));
        assertEquals("C++", languageClassifier.classify("vector.hpp"));
        assertEquals("C#", languageClassifier.classify("Program.cs"));
        assertEquals("Go", languageClassifier.classify("main.go"));
        assertEquals("Rust", languageClassifier.classify("lib.rs"));
        assertEquals("Kotlin", languageClassifier.classify("App.kt"));
        assertEquals("HTML", languageClassifier.classify("index.html"));
        assertEquals("CSS", languageClassifier.classify("styles.css"));
        assertEquals("SQL", languageClassifier.classify("schema.sql"));
        assertEquals("JSON", languageClassifier.classify("package.json"));
        assertEquals("XML", languageClassifier.classify("pom.xml"));
        assertEquals("YAML", languageClassifier.classify("application.yml"));
        assertEquals("YAML", languageClassifier.classify("docker-compose.yaml"));
        assertEquals("Markdown", languageClassifier.classify("README.md"));
        assertEquals("Shell", languageClassifier.classify("deploy.sh"));
        assertEquals("Shell", languageClassifier.classify("build.bat"));
        assertEquals("UNKNOWN", languageClassifier.classify("archive.unknownext"));
        assertEquals("UNKNOWN", languageClassifier.classify("noextension"));
    }

    @Test
    void testBinaryDetectionTextFile() throws IOException {
        Path textFile = tempDir.resolve("Normal.java");
        Files.writeString(textFile, "public class Normal { private String name; }");
        assertFalse(binaryDetector.isBinary(textFile));
    }

    @Test
    void testBinaryDetectionKnownBinaryExtension() throws IOException {
        Path pngFile = tempDir.resolve("image.png");
        Files.write(pngFile, new byte[]{1, 2, 3});
        assertTrue(binaryDetector.isBinary(pngFile));
    }

    @Test
    void testBinaryDetectionTextExtensionWithNullBytes() throws IOException {
        // Disguised binary: named .java but contains NUL bytes
        Path fakeJava = tempDir.resolve("Malicious.java");
        byte[] payload = new byte[]{ 'p', 'u', 'b', 'l', 'i', 'c', 0, 1, 2, 0 };
        Files.write(fakeJava, payload);

        assertTrue(binaryDetector.isBinary(fakeJava), "File with NUL bytes must be detected as binary");
    }
}
