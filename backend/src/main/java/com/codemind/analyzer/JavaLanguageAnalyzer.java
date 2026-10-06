package com.codemind.analyzer;

import org.springframework.stereotype.Component;

import java.nio.file.Path;

@Component
public class JavaLanguageAnalyzer implements AstAnalysisEngine {

    @Override
    public String getSupportedLanguage() {
        return "JAVA";
    }

    @Override
    public boolean supports(Path filePath) {
        if (filePath == null) {
            return false;
        }
        String fileName = filePath.getFileName().toString().toLowerCase();
        return fileName.endsWith(".java");
    }
}
