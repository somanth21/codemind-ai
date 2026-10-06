package com.codemind.ai.evidence;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Enforces strict chunk count, character, and token budgets on repository evidence.
 * Retains highest-relevance evidence chunks and drops lower-priority chunks with explicit truncation telemetry.
 */
@Component
public class ContextBudgetManager {

    public static final int MAX_EVIDENCE_CHUNKS = 10;
    public static final int MAX_CONTEXT_CHARS = 16_000;
    public static final int MAX_CONTEXT_TOKENS = 4_000;

    public record BudgetResult(
            List<EvidenceChunk> selectedChunks,
            int totalChars,
            int totalTokens,
            boolean truncated,
            int originalCount,
            int droppedCount
    ) {}

    public BudgetResult applyBudget(List<EvidenceChunk> evidenceList) {
        if (evidenceList == null || evidenceList.isEmpty()) {
            return new BudgetResult(Collections.emptyList(), 0, 0, false, 0, 0);
        }

        // Sort by deterministicScore descending (nulls last)
        List<EvidenceChunk> sorted = new ArrayList<>(evidenceList);
        sorted.sort(Comparator.comparing(
                EvidenceChunk::deterministicScore,
                Comparator.nullsLast(Comparator.reverseOrder())
        ));

        List<EvidenceChunk> selected = new ArrayList<>();
        int currentChars = 0;
        int currentTokens = 0;
        boolean truncated = false;

        for (EvidenceChunk chunk : sorted) {
            if (selected.size() >= MAX_EVIDENCE_CHUNKS) {
                truncated = true;
                break;
            }

            int chunkChars = chunk.estimatedCharacterLength();
            int chunkTokens = chunk.estimatedTokens();

            if (currentChars + chunkChars > MAX_CONTEXT_CHARS || currentTokens + chunkTokens > MAX_CONTEXT_TOKENS) {
                truncated = true;
                continue; // See if a smaller chunk fits or stop
            }

            selected.add(chunk);
            currentChars += chunkChars;
            currentTokens += chunkTokens;
        }

        if (sorted.size() > selected.size()) {
            truncated = true;
        }

        int dropped = sorted.size() - selected.size();
        return new BudgetResult(selected, currentChars, currentTokens, truncated, sorted.size(), dropped);
    }
}
