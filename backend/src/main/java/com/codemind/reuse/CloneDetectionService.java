package com.codemind.reuse;

import java.nio.file.Path;
import java.util.List;

/**
 * Deterministic Clone Detection Service Boundary.
 * Contract for Type-1, Type-2, and Type-3 syntactic/AST clone detection.
 */
public interface CloneDetectionService {
    double calculateSimilarity(String snippetA, String snippetB);
}
