package com.codemind.ingestion;

import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Deterministic Language and File Type Classifier.
 * Extension-based classification covering core programming, markup, and configuration languages.
 */
@Component
public class LanguageClassifier {

    private static final Map<String, String> EXTENSION_TO_LANGUAGE;

    static {
        Map<String, String> map = new HashMap<>();
        // Core Languages
        map.put("java", "Java");
        map.put("js", "JavaScript");
        map.put("mjs", "JavaScript");
        map.put("cjs", "JavaScript");
        map.put("jsx", "JavaScript");
        map.put("ts", "TypeScript");
        map.put("tsx", "TSX");
        map.put("py", "Python");
        map.put("c", "C");
        map.put("h", "C");
        map.put("cpp", "C++");
        map.put("cxx", "C++");
        map.put("cc", "C++");
        map.put("hpp", "C++");
        map.put("cs", "C#");
        map.put("go", "Go");
        map.put("rs", "Rust");
        map.put("kt", "Kotlin");
        map.put("kts", "Kotlin");

        // Web & Markup
        map.put("html", "HTML");
        map.put("htm", "HTML");
        map.put("css", "CSS");
        map.put("scss", "CSS");
        map.put("sass", "CSS");

        // Data & Config
        map.put("sql", "SQL");
        map.put("json", "JSON");
        map.put("xml", "XML");
        map.put("yaml", "YAML");
        map.put("yml", "YAML");
        map.put("md", "Markdown");
        map.put("markdown", "Markdown");

        // Shell scripts
        map.put("sh", "Shell");
        map.put("bash", "Shell");
        map.put("zsh", "Shell");
        map.put("bat", "Shell");
        map.put("cmd", "Shell");
        map.put("ps1", "Shell");

        EXTENSION_TO_LANGUAGE = Collections.unmodifiableMap(map);
    }

    public String classify(String fileName) {
        if (fileName == null || fileName.trim().isEmpty()) {
            return "UNKNOWN";
        }

        String extension = extractExtension(fileName);
        if (extension == null) {
            // Check for known extensionless files
            String lowerName = fileName.toLowerCase(Locale.ROOT);
            if (lowerName.equals("dockerfile") || lowerName.equals("makefile")) {
                return "Shell";
            }
            return "UNKNOWN";
        }

        return EXTENSION_TO_LANGUAGE.getOrDefault(extension.toLowerCase(Locale.ROOT), "UNKNOWN");
    }

    public String extractExtension(String fileName) {
        if (fileName == null) {
            return null;
        }
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot > 0 && lastDot < fileName.length() - 1) {
            return fileName.substring(lastDot + 1);
        }
        return null;
    }
}
