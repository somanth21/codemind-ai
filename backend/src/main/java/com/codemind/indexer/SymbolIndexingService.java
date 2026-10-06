package com.codemind.indexer;

import java.util.UUID;

/**
 * Symbol Indexing Service Boundary.
 * Contract for token, AST symbol, and embedding indexing (to be implemented in Phase 3).
 */
public interface SymbolIndexingService {
    void indexRepository(UUID snapshotId);
}
