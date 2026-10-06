package com.codemind.architecture.model;

public record ArchitectureSmell(
        String smellId,
        String target,
        String severity, // "HIGH", "MEDIUM", "LOW"
        String explanation,
        String evidence,
        String remediation
) {}
