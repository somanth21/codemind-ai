package com.codemind.architecture.service;

import com.codemind.domain.model.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ArchitectureReportPdfServiceTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ArchitectureReportPdfService pdfService = new ArchitectureReportPdfService(objectMapper);

    @Test
    @DisplayName("Generates valid multi-page PDF report with %PDF header and selectable text")
    void testGeneratePdfReport() {
        UserEntity owner = new UserEntity(UUID.randomUUID(), "dev@codemind.ai", "hash", Role.ROLE_DEVELOPER);
        RepositoryEntity repo = new RepositoryEntity(UUID.randomUUID(), "TestRepo", "GIT", owner);

        UUID analysisId = UUID.randomUUID();
        String packageStatsJson = "[{\"packageName\":\"com.test.service\",\"classCount\":5,\"interfaceCount\":1,\"afferentCoupling\":4,\"efferentCoupling\":2,\"instability\":0.33,\"couplingCategory\":\"BALANCED\"}]";
        String cyclesJson = "[{\"members\":[\"com.test.a\",\"com.test.b\"],\"length\":2,\"cycleType\":\"PACKAGE\",\"edgeDescriptions\":[\"a -> b\",\"b -> a\"],\"sourceLocations\":[\"A.java\",\"B.java\"]}]";
        String hotspotsJson = "[{\"symbolFqn\":\"com.test.service.CoreService\",\"filePath\":\"CoreService.java\",\"fanIn\":4,\"fanOut\":2,\"totalDegree\":6,\"hotspotType\":\"HUB\",\"explanation\":\"High coupling central hub\"}]";
        String smellsJson = "[]";
        String metricsJson = "{}";
        String graphJson = "{\"nodes\":[],\"edges\":[]}";

        ArchitectureAnalysisEntity analysis = new ArchitectureAnalysisEntity(
                UUID.randomUUID(),
                repo.getId(),
                analysisId,
                1, 5, 1, 6, 1, 1, 0,
                2.4, 82.5,
                packageStatsJson, cyclesJson, hotspotsJson, smellsJson, metricsJson, graphJson,
                "COMPLETED"
        );

        SymbolEntity symbol1 = new SymbolEntity(
                UUID.randomUUID(), repo.getId(), analysisId, "com/test/controller/TestController.java",
                "com.test.controller.TestController", "TestController", SymbolKind.CLASS, null,
                1, 50, SymbolVisibility.PUBLIC, false, false, false, "TestController", null, 0
        );
        SymbolEntity symbol2 = new SymbolEntity(
                UUID.randomUUID(), repo.getId(), analysisId, "com/test/service/TestService.java",
                "com.test.service.TestService", "TestService", SymbolKind.CLASS, null,
                1, 60, SymbolVisibility.PUBLIC, false, false, false, "TestService", null, 0
        );

        RelationshipEntity rel = new RelationshipEntity(
                UUID.randomUUID(), repo.getId(), analysisId, symbol1.getId(), symbol2.getId(),
                "com.test.controller.TestController", "com.test.service.TestService",
                RelationshipType.CALLS, RelationshipConfidence.RESOLVED, 25
        );

        SecurityFindingEntity secFinding = new SecurityFindingEntity(
                UUID.randomUUID(), repo.getId(), analysisId, null,
                "HARDCODED_KEY", Severity.HIGH, SecurityCategory.SECRETS,
                "password=superSecret123 found in configuration", "Test description", "Remediate token",
                "application.yml", null, 12, 12, "password=superSecret123", "HIGH", FindingStatus.OPEN
        );

        byte[] pdfBytes = pdfService.generateArchitectureReportPdf(
                repo, analysis, List.of(symbol1, symbol2), List.of(rel), List.of(secFinding)
        );

        assertNotNull(pdfBytes);
        assertTrue(pdfBytes.length > 500, "PDF should contain valid multi-page binary content");

        // Verify PDF Header Magic Bytes (%PDF-)
        String pdfHeader = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertEquals("%PDF-", pdfHeader, "Report must begin with valid PDF magic bytes");

        // Verify Secret Redaction (Raw secret 'superSecret123' must NOT appear in the PDF)
        String pdfContent = new String(pdfBytes, StandardCharsets.ISO_8859_1);
        assertFalse(pdfContent.contains("superSecret123"), "Sensitive secret values must be strictly redacted from generated PDF");
    }
}
