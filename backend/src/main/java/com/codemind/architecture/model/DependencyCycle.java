package com.codemind.architecture.model;

import java.util.List;

public record DependencyCycle(
        List<String> members,
        int length,
        String cycleType, // "CLASS" or "PACKAGE"
        List<String> edgeDescriptions,
        List<String> sourceLocations
) {}
