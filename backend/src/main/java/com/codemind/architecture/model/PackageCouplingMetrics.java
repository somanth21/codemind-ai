package com.codemind.architecture.model;

public record PackageCouplingMetrics(
        String packageName,
        int classCount,
        int interfaceCount,
        int afferentCoupling, // Ca: incoming dependencies
        int efferentCoupling, // Ce: outgoing dependencies
        double instability,   // I = Ce / (Ca + Ce)
        String couplingCategory
) {
    public static double calculateInstability(int ca, int ce) {
        int total = ca + ce;
        if (total == 0) {
            return 0.0;
        }
        return (double) ce / (double) total;
    }
}
