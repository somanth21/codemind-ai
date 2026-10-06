package com.codemind.reuse;

import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;

@Service
public class CloneDetectionServiceImpl implements CloneDetectionService {

    private static final Pattern WHITESPACE_PATTERN = Pattern.compile("\\s+");
    private static final Pattern NON_ALPHANUMERIC = Pattern.compile("[^a-zA-Z0-9_$]+");

    @Override
    public double calculateSimilarity(String snippetA, String snippetB) {
        if (snippetA == null || snippetB == null) {
            return 0.0;
        }

        String normA = normalize(snippetA);
        String normB = normalize(snippetB);

        if (normA.isEmpty() && normB.isEmpty()) {
            return 1.0;
        }
        if (normA.isEmpty() || normB.isEmpty()) {
            return 0.0;
        }

        // Exact match (Type-1 clone)
        if (normA.equals(normB)) {
            return 1.0;
        }

        List<String> tokensA = tokenize(normA);
        List<String> tokensB = tokenize(normB);

        if (tokensA.isEmpty() && tokensB.isEmpty()) {
            return 1.0;
        }
        if (tokensA.isEmpty() || tokensB.isEmpty()) {
            return 0.0;
        }

        // Compute Token Jaccard similarity (Type-2 / Type-3 clone estimation)
        Set<String> setA = new HashSet<>(tokensA);
        Set<String> setB = new HashSet<>(tokensB);

        Set<String> intersection = new HashSet<>(setA);
        intersection.retainAll(setB);

        Set<String> union = new HashSet<>(setA);
        union.addAll(setB);

        if (union.isEmpty()) {
            return 0.0;
        }

        double jaccard = (double) intersection.size() / union.size();
        return Math.round(jaccard * 1000.0) / 1000.0;
    }

    private String normalize(String code) {
        // Remove line comments and block comments
        String stripped = code.replaceAll("//.*|/\\*.*?\\*/", "");
        return WHITESPACE_PATTERN.matcher(stripped.trim()).replaceAll(" ");
    }

    private List<String> tokenize(String normalizedCode) {
        String[] tokens = NON_ALPHANUMERIC.split(normalizedCode);
        List<String> list = new ArrayList<>();
        for (String t : tokens) {
            String trimmed = t.trim().toLowerCase();
            if (!trimmed.isEmpty()) {
                list.add(trimmed);
            }
        }
        return list;
    }
}
