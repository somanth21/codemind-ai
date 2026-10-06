package com.codemind.ai;

import com.codemind.ai.evidence.ContextBudgetManager;
import com.codemind.ai.evidence.EvidenceChunk;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ContextBudgetManagerTest {

    private final ContextBudgetManager budgetManager = new ContextBudgetManager();

    @Test
    @DisplayName("Empty evidence list produces empty result with truncated=false")
    void emptyEvidence() {
        ContextBudgetManager.BudgetResult result = budgetManager.applyBudget(List.of());
        assertTrue(result.selectedChunks().isEmpty());
        assertEquals(0, result.totalChars());
        assertEquals(0, result.totalTokens());
        assertFalse(result.truncated());
        assertEquals(0, result.originalCount());
    }

    @Test
    @DisplayName("Small evidence chunks fit within budget without truncation")
    void smallEvidenceWithinBudget() {
        List<EvidenceChunk> chunks = List.of(
                new EvidenceChunk("E1", UUID.randomUUID(), UUID.randomUUID(), "src/Foo.java", "foo", 1, 10, "int x = 1;", "REUSE", 0.95),
                new EvidenceChunk("E2", UUID.randomUUID(), UUID.randomUUID(), "src/Bar.java", "bar", 1, 10, "int y = 2;", "REUSE", 0.85)
        );

        ContextBudgetManager.BudgetResult result = budgetManager.applyBudget(chunks);
        assertEquals(2, result.selectedChunks().size());
        assertFalse(result.truncated());
        assertEquals(2, result.originalCount());
        assertEquals(0, result.droppedCount());
        assertTrue(result.totalChars() > 0);
        assertTrue(result.totalTokens() > 0);
    }

    @Test
    @DisplayName("Evidence exceeding MAX_EVIDENCE_CHUNKS (10) is truncated with lower scores dropped")
    void exceedsMaxChunks() {
        List<EvidenceChunk> chunks = new ArrayList<>();
        for (int i = 1; i <= 15; i++) {
            chunks.add(new EvidenceChunk(
                    "E" + i,
                    UUID.randomUUID(),
                    UUID.randomUUID(),
                    "src/File" + i + ".java",
                    "method" + i,
                    1,
                    10,
                    "void method" + i + "() {}",
                    "REUSE",
                    (double) i / 15.0
            ));
        }

        ContextBudgetManager.BudgetResult result = budgetManager.applyBudget(chunks);
        assertEquals(ContextBudgetManager.MAX_EVIDENCE_CHUNKS, result.selectedChunks().size());
        assertTrue(result.truncated());
        assertEquals(15, result.originalCount());
        assertEquals(5, result.droppedCount());

        // Highest score chunk should be first (E15 has score 1.0)
        assertEquals("E15", result.selectedChunks().get(0).evidenceId());
    }

    @Test
    @DisplayName("Evidence exceeding character budget is truncated")
    void exceedsCharBudget() {
        String largeSnippet = "a".repeat(10_000);
        List<EvidenceChunk> chunks = List.of(
                new EvidenceChunk("E1", UUID.randomUUID(), UUID.randomUUID(), "src/A.java", "a", 1, 100, largeSnippet, "REUSE", 0.9),
                new EvidenceChunk("E2", UUID.randomUUID(), UUID.randomUUID(), "src/B.java", "b", 1, 100, largeSnippet, "REUSE", 0.8)
        );

        ContextBudgetManager.BudgetResult result = budgetManager.applyBudget(chunks);
        // Only 1 chunk should fit under 16,000 chars
        assertEquals(1, result.selectedChunks().size());
        assertTrue(result.truncated());
        assertEquals("E1", result.selectedChunks().get(0).evidenceId());
    }
}
