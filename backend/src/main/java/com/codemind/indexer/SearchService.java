package com.codemind.indexer;

import java.util.List;
import java.util.UUID;

/**
 * Hybrid Search Service Boundary.
 * Contract for dense vector + lexical symbol search with Reciprocal Rank Fusion.
 */
public interface SearchService {
    List<String> searchSymbols(UUID snapshotId, String query, int limit);
}
