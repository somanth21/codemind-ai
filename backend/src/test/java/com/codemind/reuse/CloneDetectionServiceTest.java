package com.codemind.reuse;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CloneDetectionServiceTest {

    private CloneDetectionService cloneDetectionService;

    @BeforeEach
    void setUp() {
        cloneDetectionService = new CloneDetectionServiceImpl();
    }

    @Test
    @DisplayName("Identical code snippets return similarity 1.0 (Type-1 Clone)")
    void testExactMatchClone() {
        String code1 = "public int add(int a, int b) { return a + b; }";
        String code2 = "public int add(int a, int b) { return a + b; }";

        double sim = cloneDetectionService.calculateSimilarity(code1, code2);
        assertEquals(1.0, sim);
    }

    @Test
    @DisplayName("Code with comment and whitespace variations returns high similarity (Type-2 Clone)")
    void testCommentAndWhitespaceClone() {
        String code1 = "// Compute sum\npublic int add(int a, int b) {\n    return a + b;\n}";
        String code2 = "public int add(int a, int b) { /* inline */ return a + b; }";

        double sim = cloneDetectionService.calculateSimilarity(code1, code2);
        assertTrue(sim >= 0.95, "Expected high similarity despite whitespace/comment diffs, got " + sim);
    }

    @Test
    @DisplayName("Dissimilar code snippets return low similarity")
    void testDissimilarCode() {
        String code1 = "public int add(int a, int b) { return a + b; }";
        String code2 = "public void sendHttpResponse(HttpServletResponse resp, String html) throws IOException { resp.getWriter().write(html); }";

        double sim = cloneDetectionService.calculateSimilarity(code1, code2);
        assertTrue(sim < 0.25, "Expected low similarity for dissimilar snippets, got " + sim);
    }
}
