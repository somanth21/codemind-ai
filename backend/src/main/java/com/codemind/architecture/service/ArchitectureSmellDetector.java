package com.codemind.architecture.service;

import com.codemind.architecture.model.ArchitectureHotspot;
import com.codemind.architecture.model.ArchitectureSmell;
import com.codemind.architecture.model.DependencyCycle;
import com.codemind.architecture.model.PackageCouplingMetrics;
import com.codemind.domain.model.FileMetricsEntity;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ArchitectureSmellDetector {

    public List<ArchitectureSmell> detectSmells(
            List<DependencyCycle> cycles,
            List<PackageCouplingMetrics> packageMetrics,
            List<ArchitectureHotspot> hotspots,
            List<FileMetricsEntity> fileMetrics
    ) {
        List<ArchitectureSmell> smells = new ArrayList<>();

        // 1. Dependency Cycles Smell
        if (cycles != null && !cycles.isEmpty()) {
            for (DependencyCycle cycle : cycles) {
                smells.add(new ArchitectureSmell(
                        "SMELL_CYCLIC_DEPENDENCY",
                        String.join(" -> ", cycle.members()),
                        "HIGH",
                        cycle.cycleType() + " dependency cycle detected forming closed coupling loop (" + cycle.length() + " elements)",
                        "Members: " + String.join(", ", cycle.members()),
                        "Refactor cyclical dependencies by introducing interfaces or extracting shared mediator abstractions."
                ));
            }
        }

        // 2. God Class / Excessively Large Class Smell
        if (fileMetrics != null) {
            for (FileMetricsEntity fm : fileMetrics) {
                if (fm.getLoc() > 500 || fm.getMethodCount() > 20) {
                    smells.add(new ArchitectureSmell(
                        "SMELL_GOD_CLASS",
                        fm.getFilePath(),
                        "MEDIUM",
                        "Excessively large source file (LOC: " + fm.getLoc() + ", Methods: " + fm.getMethodCount() + ")",
                        "LOC: " + fm.getLoc() + " (threshold: 500), Methods: " + fm.getMethodCount() + " (threshold: 20)",
                        "Decompose into smaller, single-responsibility cohesive classes following the Single Responsibility Principle."
                    ));
                }
            }
        }

        // 3. Excessive Fan-Out Hotspots
        if (hotspots != null) {
            for (ArchitectureHotspot hs : hotspots) {
                if ("HIGH_FAN_OUT".equals(hs.hotspotType()) || hs.fanOut() > 10) {
                    smells.add(new ArchitectureSmell(
                            "SMELL_EXCESSIVE_FAN_OUT",
                            hs.symbolFqn(),
                            "MEDIUM",
                            "Type has excessive outgoing dependencies (Fan-Out: " + hs.fanOut() + ")",
                            "Fan-out: " + hs.fanOut() + " (threshold: 10)",
                            "Encapsulate dependencies behind facade or adapter patterns to reduce structural coupling."
                    ));
                }
            }
        }

        // 4. Unstable Dependency Hubs
        if (packageMetrics != null) {
            for (PackageCouplingMetrics pm : packageMetrics) {
                if (pm.instability() >= 0.7 && pm.efferentCoupling() >= 5) {
                    smells.add(new ArchitectureSmell(
                            "SMELL_UNSTABLE_DEPENDENCY_HUB",
                            pm.packageName(),
                            "LOW",
                            "Package '" + pm.packageName() + "' is highly unstable (I=" + String.format("%.2f", pm.instability()) + ") yet heavily depends on external packages (Ce=" + pm.efferentCoupling() + ")",
                            "Instability: " + String.format("%.2f", pm.instability()) + ", Ce: " + pm.efferentCoupling(),
                            "Isolate external dependencies and invert dependency relationships using interfaces."
                    ));
                }
            }
        }

        return smells;
    }
}
