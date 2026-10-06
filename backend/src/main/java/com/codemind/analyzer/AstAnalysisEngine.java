package com.codemind.analyzer;

import java.nio.file.Path;

/**
 * AST Analysis Engine Boundary.
 * Contract for deterministic AST parsing and symbol extraction (to be implemented in Phase 2).
 */
public interface AstAnalysisEngine {
    String getSupportedLanguage();
    boolean supports(Path filePath);
}
