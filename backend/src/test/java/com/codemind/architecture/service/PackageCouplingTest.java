package com.codemind.architecture.service;

import com.codemind.architecture.model.PackageCouplingMetrics;
import com.codemind.domain.model.RelationshipConfidence;
import com.codemind.domain.model.RelationshipEntity;
import com.codemind.domain.model.RelationshipType;
import com.codemind.domain.model.SymbolEntity;
import com.codemind.domain.model.SymbolKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class PackageCouplingTest {

    private final PackageAnalysisService service = new PackageAnalysisService();

    @Test
    @DisplayName("Division-by-zero guard returns 0.0 instability when Ca + Ce == 0")
    void testInstabilityDivisionByZeroGuard() {
        double instability = PackageCouplingMetrics.calculateInstability(0, 0);
        assertEquals(0.0, instability);
        assertFalse(Double.isNaN(instability));
        assertFalse(Double.isInfinite(instability));
    }

    @Test
    @DisplayName("Calculates Ca, Ce, Instability, and Category accurately")
    void testCouplingMetricsCalculation() {
        UUID repoId = UUID.randomUUID();
        UUID runId = UUID.randomUUID();

        // Package A: Class A
        SymbolEntity symA = new SymbolEntity(
                UUID.randomUUID(), repoId, runId, "com/example/a/ServiceA.java",
                "com.example.a.ServiceA", "ServiceA", SymbolKind.CLASS,
                null, 1, 50, null, false, false, false,
                "class ServiceA", null, 0
        );

        // Package B: Class B
        SymbolEntity symB = new SymbolEntity(
                UUID.randomUUID(), repoId, runId, "com/example/b/ServiceB.java",
                "com.example.b.ServiceB", "ServiceB", SymbolKind.CLASS,
                null, 1, 50, null, false, false, false,
                "class ServiceB", null, 0
        );

        // A calls B:
        // Package A: Ce = 1 (depends on B), Ca = 0 -> Instability = 1.0 (HIGHLY_UNSTABLE)
        // Package B: Ca = 1 (depended upon by A), Ce = 0 -> Instability = 0.0 (HIGHLY_STABLE)
        RelationshipEntity rel = new RelationshipEntity(
                UUID.randomUUID(), repoId, runId,
                symA.getId(), symB.getId(),
                "com.example.a.ServiceA", "com.example.b.ServiceB",
                RelationshipType.CALLS, RelationshipConfidence.RESOLVED, 10
        );

        List<PackageCouplingMetrics> metrics = service.analyzePackages(List.of(symA, symB), List.of(rel));

        assertEquals(2, metrics.size());

        PackageCouplingMetrics pkgA = metrics.stream()
                .filter(m -> "com.example.a".equals(m.packageName()))
                .findFirst()
                .orElse(null);
        assertNotNull(pkgA);
        assertEquals(0, pkgA.afferentCoupling());
        assertEquals(1, pkgA.efferentCoupling());
        assertEquals(1.0, pkgA.instability());
        assertEquals("BALANCED", pkgA.couplingCategory());

        PackageCouplingMetrics pkgB = metrics.stream()
                .filter(m -> "com.example.b".equals(m.packageName()))
                .findFirst()
                .orElse(null);
        assertNotNull(pkgB);
        assertEquals(1, pkgB.afferentCoupling());
        assertEquals(0, pkgB.efferentCoupling());
        assertEquals(0.0, pkgB.instability());
        assertEquals("BALANCED", pkgB.couplingCategory());
    }
}
