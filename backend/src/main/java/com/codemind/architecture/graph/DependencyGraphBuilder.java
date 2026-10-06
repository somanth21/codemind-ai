package com.codemind.architecture.graph;

import com.codemind.architecture.model.ArchitectureGraph;
import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.SymbolEntity;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class DependencyGraphBuilder {

    public ArchitectureGraph buildGraph(List<SymbolEntity> symbols, List<RelationshipEntity> relationships) {
        List<ArchitectureGraph.GraphNode> nodes = new ArrayList<>();
        Map<String, ArchitectureGraph.GraphNode> nodeMap = new HashMap<>();

        // 1. Create Nodes for Classes and Interfaces
        if (symbols != null) {
            for (SymbolEntity s : symbols) {
                String kind = s.getKind() != null ? s.getKind().name() : "CLASS";
                if ("CLASS".equals(kind) || "INTERFACE".equals(kind) || "RECORD".equals(kind) || "ENUM".equals(kind)) {
                    String fqn = s.getFqn() != null ? s.getFqn() : s.getName();
                    String pkg = extractPackage(fqn);

                    Map<String, Object> meta = new HashMap<>();
                    meta.put("filePath", s.getFilePath());
                    meta.put("package", pkg);
                    meta.put("startLine", s.getStartLine());
                    meta.put("endLine", s.getEndLine());

                    ArchitectureGraph.GraphNode node = new ArchitectureGraph.GraphNode(
                            fqn, s.getName(), kind, meta
                    );
                    nodeMap.put(fqn, node);
                    nodes.add(node);
                }
            }
        }

        // 2. Create Directed Edges from Relationships
        Map<String, EdgeAccumulator> edgeMap = new LinkedHashMap<>();

        if (relationships != null) {
            for (RelationshipEntity rel : relationships) {
                String src = rel.getSourceFqn();
                String tgt = rel.getTargetFqn();
                if (src == null || tgt == null || src.equals(tgt)) {
                    continue;
                }

                // If target or source FQN references inner methods, normalize to class FQN
                String srcClass = normalizeToClassFqn(src);
                String tgtClass = normalizeToClassFqn(tgt);

                if (srcClass.equals(tgtClass)) {
                    continue;
                }

                // Ensure nodes exist even if external library or unresolved
                nodeMap.computeIfAbsent(srcClass, k -> {
                    ArchitectureGraph.GraphNode n = new ArchitectureGraph.GraphNode(k, extractSimpleName(k), "CLASS", Map.of("package", extractPackage(k)));
                    nodes.add(n);
                    return n;
                });

                nodeMap.computeIfAbsent(tgtClass, k -> {
                    ArchitectureGraph.GraphNode n = new ArchitectureGraph.GraphNode(k, extractSimpleName(k), "CLASS", Map.of("package", extractPackage(k)));
                    nodes.add(n);
                    return n;
                });

                String edgeKey = srcClass + "->" + tgtClass + ":" + rel.getRelationshipType().name();
                String prov = rel.getLineNumber() != null ? "line " + rel.getLineNumber() : "declaration";

                EdgeAccumulator acc = edgeMap.computeIfAbsent(edgeKey, k -> new EdgeAccumulator(
                        UUID.randomUUID().toString(), srcClass, tgtClass, rel.getRelationshipType().name(), prov
                ));
                acc.weight++;
            }
        }

        List<ArchitectureGraph.GraphEdge> edges = new ArrayList<>();
        for (EdgeAccumulator acc : edgeMap.values()) {
            edges.add(new ArchitectureGraph.GraphEdge(
                    acc.id, acc.source, acc.target, acc.relationshipType, acc.weight, acc.provenance
            ));
        }

        return new ArchitectureGraph(nodes, edges);
    }

    private static class EdgeAccumulator {
        final String id;
        final String source;
        final String target;
        final String relationshipType;
        final String provenance;
        int weight = 0;

        EdgeAccumulator(String id, String source, String target, String relationshipType, String provenance) {
            this.id = id;
            this.source = source;
            this.target = target;
            this.relationshipType = relationshipType;
            this.provenance = provenance;
        }
    }

    private String extractPackage(String fqn) {
        if (fqn == null) return "";
        int lastDot = fqn.lastIndexOf('.');
        return lastDot > 0 ? fqn.substring(0, lastDot) : "default";
    }

    private String extractSimpleName(String fqn) {
        if (fqn == null) return "";
        int lastDot = fqn.lastIndexOf('.');
        return lastDot >= 0 ? fqn.substring(lastDot + 1) : fqn;
    }

    private String normalizeToClassFqn(String fqn) {
        if (fqn == null) return "";
        // If FQN is like com.foo.Bar#method or com.foo.Bar.method, strip method
        int hashIdx = fqn.indexOf('#');
        if (hashIdx > 0) {
            return fqn.substring(0, hashIdx);
        }
        return fqn;
    }
}
