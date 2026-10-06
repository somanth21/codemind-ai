package com.codemind.architecture.graph;

import com.codemind.architecture.model.ArchitectureGraph;
import com.codemind.architecture.model.DependencyCycle;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Deterministic Cycle Detection Service using Depth-First Search with backtracking.
 * Identifies 2-cycles (A -> B -> A) and higher-order cycles (A -> B -> C -> A) with canonical rotation deduplication.
 */
@Service
public class CycleDetectionService {

    public List<DependencyCycle> detectCycles(ArchitectureGraph graph) {
        List<DependencyCycle> detectedCycles = new ArrayList<>();
        if (graph == null || graph.nodes().isEmpty() || graph.edges().isEmpty()) {
            return detectedCycles;
        }

        // 1. Build adjacency list for Class-level graph
        Map<String, Set<String>> adjList = new HashMap<>();
        Map<String, List<String>> edgeDetails = new HashMap<>();

        for (ArchitectureGraph.GraphEdge edge : graph.edges()) {
            adjList.computeIfAbsent(edge.source(), k -> new LinkedHashSet<>()).add(edge.target());
            String key = edge.source() + "->" + edge.target();
            edgeDetails.computeIfAbsent(key, k -> new ArrayList<>()).add(edge.relationshipType() + " (" + edge.provenance() + ")");
        }

        // 2. Class Cycle Detection
        Set<String> visited = new HashSet<>();
        Set<String> onStack = new HashSet<>();
        List<String> path = new ArrayList<>();
        Set<String> seenCanonicalCycles = new HashSet<>();

        for (String node : adjList.keySet()) {
            if (!visited.contains(node)) {
                findCyclesDfs(node, adjList, visited, onStack, path, seenCanonicalCycles, edgeDetails, "CLASS", detectedCycles);
            }
        }

        // 3. Package Cycle Detection
        Map<String, Set<String>> packageAdjList = new HashMap<>();
        for (ArchitectureGraph.GraphEdge edge : graph.edges()) {
            String srcPkg = extractPackage(edge.source());
            String tgtPkg = extractPackage(edge.target());
            if (!srcPkg.equals(tgtPkg) && !srcPkg.isBlank() && !tgtPkg.isBlank()) {
                packageAdjList.computeIfAbsent(srcPkg, k -> new LinkedHashSet<>()).add(tgtPkg);
            }
        }

        Set<String> pkgVisited = new HashSet<>();
        Set<String> pkgOnStack = new HashSet<>();
        List<String> pkgPath = new ArrayList<>();
        Set<String> seenPkgCycles = new HashSet<>();

        for (String pkg : packageAdjList.keySet()) {
            if (!pkgVisited.contains(pkg)) {
                findCyclesDfs(pkg, packageAdjList, pkgVisited, pkgOnStack, pkgPath, seenPkgCycles, Map.of(), "PACKAGE", detectedCycles);
            }
        }

        return detectedCycles;
    }

    private void findCyclesDfs(
            String current,
            Map<String, Set<String>> adj,
            Set<String> visited,
            Set<String> onStack,
            List<String> path,
            Set<String> seenCycles,
            Map<String, List<String>> edgeDetails,
            String cycleType,
            List<DependencyCycle> results
    ) {
        visited.add(current);
        onStack.add(current);
        path.add(current);

        Set<String> neighbors = adj.getOrDefault(current, Collections.emptySet());
        for (String neighbor : neighbors) {
            if (onStack.contains(neighbor)) {
                // Cycle detected from neighbor to current!
                int cycleStartIdx = path.indexOf(neighbor);
                if (cycleStartIdx >= 0) {
                    List<String> cycleMembers = new ArrayList<>(path.subList(cycleStartIdx, path.size()));
                    String canonical = canonicalCycleKey(cycleMembers);
                    if (!seenCycles.contains(canonical)) {
                        seenCycles.add(canonical);

                        List<String> edgeDescs = new ArrayList<>();
                        List<String> locations = new ArrayList<>();

                        for (int i = 0; i < cycleMembers.size(); i++) {
                            String from = cycleMembers.get(i);
                            String to = cycleMembers.get((i + 1) % cycleMembers.size());
                            String key = from + "->" + to;
                            List<String> details = edgeDetails.getOrDefault(key, List.of("DEPENDS_ON"));
                            edgeDescs.add(from + " -> " + to + " via " + String.join(", ", details));
                            locations.add(from + " -> " + to);
                        }

                        results.add(new DependencyCycle(
                                cycleMembers,
                                cycleMembers.size(),
                                cycleType,
                                edgeDescs,
                                locations
                        ));
                    }
                }
            } else if (!visited.contains(neighbor)) {
                findCyclesDfs(neighbor, adj, visited, onStack, path, seenCycles, edgeDetails, cycleType, results);
            }
        }

        onStack.remove(current);
        path.remove(path.size() - 1);
    }

    public static String canonicalCycleKey(List<String> members) {
        if (members == null || members.isEmpty()) return "";
        // Find minimum element index
        int minIdx = 0;
        for (int i = 1; i < members.size(); i++) {
            if (members.get(i).compareTo(members.get(minIdx)) < 0) {
                minIdx = i;
            }
        }
        // Rotate members so minimum element is first
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < members.size(); i++) {
            int idx = (minIdx + i) % members.size();
            sb.append(members.get(idx)).append("->");
        }
        return sb.toString();
    }

    private String extractPackage(String fqn) {
        if (fqn == null) return "";
        int lastDot = fqn.lastIndexOf('.');
        return lastDot > 0 ? fqn.substring(0, lastDot) : "default";
    }
}
