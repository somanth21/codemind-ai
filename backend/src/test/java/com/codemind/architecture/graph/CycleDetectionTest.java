package com.codemind.architecture.graph;

import com.codemind.architecture.model.ArchitectureGraph;
import com.codemind.architecture.model.DependencyCycle;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class CycleDetectionTest {

    private final CycleDetectionService cycleDetector = new CycleDetectionService();

    @Test
    @DisplayName("Detects direct 2-node cycle (A -> B -> A)")
    void testTwoNodeCycle() {
        ArchitectureGraph.GraphNode nodeA = new ArchitectureGraph.GraphNode("ClassA", "ClassA", "CLASS", Map.of("packageName", "pkg1"));
        ArchitectureGraph.GraphNode nodeB = new ArchitectureGraph.GraphNode("ClassB", "ClassB", "CLASS", Map.of("packageName", "pkg2"));

        ArchitectureGraph.GraphEdge edge1 = new ArchitectureGraph.GraphEdge("e1", "ClassA", "ClassB", "CALLS", 1, "A calls B");
        ArchitectureGraph.GraphEdge edge2 = new ArchitectureGraph.GraphEdge("e2", "ClassB", "ClassA", "CALLS", 1, "B calls A");

        ArchitectureGraph graph = new ArchitectureGraph(List.of(nodeA, nodeB), List.of(edge1, edge2));

        List<DependencyCycle> cycles = cycleDetector.detectCycles(graph);

        assertEquals(1, cycles.size()); // 1 class-level cycle

        DependencyCycle classCycle = cycles.stream()
                .filter(c -> "CLASS".equals(c.cycleType()))
                .findFirst()
                .orElse(null);

        assertNotNull(classCycle);
        assertEquals(2, classCycle.length());
        assertTrue(classCycle.members().contains("ClassA"));
        assertTrue(classCycle.members().contains("ClassB"));
    }

    @Test
    @DisplayName("Detects 3-node cycle (A -> B -> C -> A) and deduplicates permutations")
    void testThreeNodeCycleDeduplication() {
        ArchitectureGraph.GraphNode nodeA = new ArchitectureGraph.GraphNode("ClassA", "ClassA", "CLASS", Map.of("packageName", "pkg"));
        ArchitectureGraph.GraphNode nodeB = new ArchitectureGraph.GraphNode("ClassB", "ClassB", "CLASS", Map.of("packageName", "pkg"));
        ArchitectureGraph.GraphNode nodeC = new ArchitectureGraph.GraphNode("ClassC", "ClassC", "CLASS", Map.of("packageName", "pkg"));

        ArchitectureGraph.GraphEdge edge1 = new ArchitectureGraph.GraphEdge("e1", "ClassA", "ClassB", "CALLS", 1, "declaration");
        ArchitectureGraph.GraphEdge edge2 = new ArchitectureGraph.GraphEdge("e2", "ClassB", "ClassC", "CALLS", 1, "declaration");
        ArchitectureGraph.GraphEdge edge3 = new ArchitectureGraph.GraphEdge("e3", "ClassC", "ClassA", "CALLS", 1, "declaration");

        ArchitectureGraph graph = new ArchitectureGraph(
                List.of(nodeA, nodeB, nodeC),
                List.of(edge1, edge2, edge3)
        );

        List<DependencyCycle> cycles = cycleDetector.detectCycles(graph);

        // Deduplication guarantee: The cycle A -> B -> C -> A must only be reported ONCE
        List<DependencyCycle> classCycles = cycles.stream()
                .filter(c -> "CLASS".equals(c.cycleType()))
                .toList();

        assertEquals(1, classCycles.size());
        assertEquals(3, classCycles.get(0).length());
        assertEquals(3, classCycles.get(0).members().size());
    }

    @Test
    @DisplayName("Reports 0 cycles on strictly acyclic directed graph (DAG)")
    void testAcyclicGraph() {
        ArchitectureGraph.GraphNode nodeA = new ArchitectureGraph.GraphNode("ClassA", "ClassA", "CLASS", Map.of("packageName", "pkgA"));
        ArchitectureGraph.GraphNode nodeB = new ArchitectureGraph.GraphNode("ClassB", "ClassB", "CLASS", Map.of("packageName", "pkgB"));
        ArchitectureGraph.GraphNode nodeC = new ArchitectureGraph.GraphNode("ClassC", "ClassC", "CLASS", Map.of("packageName", "pkgC"));

        // A -> B -> C (DAG)
        ArchitectureGraph.GraphEdge edge1 = new ArchitectureGraph.GraphEdge("e1", "ClassA", "ClassB", "CALLS", 1, "declaration");
        ArchitectureGraph.GraphEdge edge2 = new ArchitectureGraph.GraphEdge("e2", "ClassB", "ClassC", "CALLS", 1, "declaration");

        ArchitectureGraph graph = new ArchitectureGraph(
                List.of(nodeA, nodeB, nodeC),
                List.of(edge1, edge2)
        );

        List<DependencyCycle> cycles = cycleDetector.detectCycles(graph);
        assertTrue(cycles.isEmpty());
    }
}
