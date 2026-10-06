package com.codemind.architecture.service;

import com.codemind.architecture.model.PackageCouplingMetrics;
import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.SymbolEntity;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class PackageAnalysisService {

    public List<PackageCouplingMetrics> analyzePackages(
            List<SymbolEntity> symbols,
            List<RelationshipEntity> relationships
    ) {
        Map<String, Set<String>> packageClasses = new HashMap<>();
        Map<String, Set<String>> packageInterfaces = new HashMap<>();

        if (symbols != null) {
            for (SymbolEntity s : symbols) {
                String kind = s.getKind() != null ? s.getKind().name() : "CLASS";
                String fqn = s.getFqn() != null ? s.getFqn() : s.getName();
                String pkg = extractPackage(fqn);

                if ("INTERFACE".equals(kind)) {
                    packageInterfaces.computeIfAbsent(pkg, k -> new HashSet<>()).add(fqn);
                } else if ("CLASS".equals(kind) || "RECORD".equals(kind) || "ENUM".equals(kind)) {
                    packageClasses.computeIfAbsent(pkg, k -> new HashSet<>()).add(fqn);
                }
            }
        }

        Set<String> allPackages = new TreeSet<>();
        allPackages.addAll(packageClasses.keySet());
        allPackages.addAll(packageInterfaces.keySet());

        // Track incoming (Ca) and outgoing (Ce) dependencies between packages
        Map<String, Set<String>> incomingDependencies = new HashMap<>();
        Map<String, Set<String>> outgoingDependencies = new HashMap<>();

        if (relationships != null) {
            for (RelationshipEntity rel : relationships) {
                String src = rel.getSourceFqn();
                String tgt = rel.getTargetFqn();
                if (src == null || tgt == null) continue;

                String srcPkg = extractPackage(src);
                String tgtPkg = extractPackage(tgt);

                if (!srcPkg.equals(tgtPkg) && !srcPkg.isBlank() && !tgtPkg.isBlank()) {
                    outgoingDependencies.computeIfAbsent(srcPkg, k -> new HashSet<>()).add(tgtPkg);
                    incomingDependencies.computeIfAbsent(tgtPkg, k -> new HashSet<>()).add(srcPkg);
                }
            }
        }

        List<PackageCouplingMetrics> results = new ArrayList<>();
        for (String pkg : allPackages) {
            int classCount = packageClasses.getOrDefault(pkg, Collections.emptySet()).size();
            int interfaceCount = packageInterfaces.getOrDefault(pkg, Collections.emptySet()).size();
            int ca = incomingDependencies.getOrDefault(pkg, Collections.emptySet()).size();
            int ce = outgoingDependencies.getOrDefault(pkg, Collections.emptySet()).size();
            double instability = PackageCouplingMetrics.calculateInstability(ca, ce);

            String category;
            if (ca == 0 && ce == 0) {
                category = "ISOLATED";
            } else if (ca >= 3 && instability <= 0.3) {
                category = "CENTRAL";
            } else if (ce >= 5 && instability >= 0.7) {
                category = "DEPENDENCY_HEAVY";
            } else if (ca + ce >= 6) {
                category = "HIGHLY_COUPLED";
            } else {
                category = "BALANCED";
            }

            results.add(new PackageCouplingMetrics(
                    pkg, classCount, interfaceCount, ca, ce, instability, category
            ));
        }

        return results;
    }

    private String extractPackage(String fqn) {
        if (fqn == null) return "";
        int hashIdx = fqn.indexOf('#');
        if (hashIdx > 0) fqn = fqn.substring(0, hashIdx);
        int lastDot = fqn.lastIndexOf('.');
        return lastDot > 0 ? fqn.substring(0, lastDot) : "default";
    }
}
