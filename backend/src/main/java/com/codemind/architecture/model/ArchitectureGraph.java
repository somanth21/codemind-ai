package com.codemind.architecture.model;

import java.util.List;
import java.util.Map;

public record ArchitectureGraph(
        List<GraphNode> nodes,
        List<GraphEdge> edges
) {
    public record GraphNode(
            String id,
            String label,
            String type, // "PACKAGE", "CLASS", "INTERFACE"
            Map<String, Object> metadata
    ) {}

    public record GraphEdge(
            String id,
            String source,
            String target,
            String relationshipType, // "EXTENDS", "IMPLEMENTS", "CALLS", "CREATES", "FIELD_ACCESS"
            int weight,
            String provenance
    ) {}
}
