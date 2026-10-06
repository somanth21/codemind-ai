package com.codemind.analyzer;

import java.nio.file.Path;

/**
 * Deterministic Metrics Service Boundary.
 * Contract for Lines of Code, Cyclomatic Complexity, and Maintainability Index calculation.
 */
public interface MetricsService {
    int countLinesOfCode(String content);
}
