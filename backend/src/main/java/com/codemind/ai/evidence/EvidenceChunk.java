package com.codemind.ai.evidence;

import java.util.UUID;

public record EvidenceChunk(
        String evidenceId,
        UUID repositoryId,
        UUID analysisId,
        String filePath,
        String symbolName,
        Integer startLine,
        Integer endLine,
        String sanitizedSnippet,
        String evidenceType,
        Double deterministicScore
) {
    public int estimatedCharacterLength() {
        int len = 0;
        if (filePath != null) len += filePath.length();
        if (symbolName != null) len += symbolName.length();
        if (sanitizedSnippet != null) len += sanitizedSnippet.length();
        if (evidenceType != null) len += evidenceType.length();
        return len + 50; // overhead
    }

    public int estimatedTokens() {
        return Math.max(1, estimatedCharacterLength() / 4);
    }
}
