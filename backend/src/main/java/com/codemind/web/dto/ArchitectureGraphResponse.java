package com.codemind.web.dto;

import com.codemind.architecture.model.ArchitectureGraph;

import java.util.List;

public record ArchitectureGraphResponse(
        List<ArchitectureGraph.GraphNode> nodes,
        List<ArchitectureGraph.GraphEdge> edges
) {
    public static ArchitectureGraphResponse fromGraph(ArchitectureGraph graph) {
        if (graph == null) {
            return new ArchitectureGraphResponse(List.of(), List.of());
        }
        return new ArchitectureGraphResponse(graph.nodes(), graph.edges());
    }
}
