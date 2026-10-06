package com.codemind.architecture.model;

public record ArchitectureHotspot(
        String symbolFqn,
        String filePath,
        int fanIn,
        int fanOut,
        int totalDegree,
        String hotspotType, // "HUB", "HIGH_FAN_OUT", "CORE_ABSTRACTION"
        String explanation
) {}
