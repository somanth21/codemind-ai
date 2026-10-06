package com.codemind.reuse;

import com.codemind.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReuseSecurityGateTest {

    private ReuseSecurityGate securityGate;

    @BeforeEach
    void setUp() {
        securityGate = new ReuseSecurityGate();
    }

    @Test
    @DisplayName("Clean candidate is evaluated as SAFE")
    void testSafeCandidate() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "Safe.java",
                "Safe.doWork()", "doWork", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void doWork()", "void", 0
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.90, null, null, List.of(), List.of(), 1, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 1.0);
        assertEquals(SecurityGateStatus.SAFE, status);
        assertTrue(securityGate.isEligibleForDirectReuse(status));
    }

    @Test
    @DisplayName("Candidate with secret findings is BLOCKED")
    void testBlockedBySecret() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "SecretFile.java",
                "SecretFile.leaky()", "leaky", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void leaky()", "void", 0
        );
        SecretFindingEntity secret = new SecretFindingEntity(
                UUID.randomUUID(), repoId, analysisId, "SecretFile.java",
                "API_KEY", Severity.CRITICAL, "HIGH", 5, "key"
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.90, null, null, List.of(), List.of(secret), 1, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 0.0);
        assertEquals(SecurityGateStatus.BLOCKED, status);
        assertFalse(securityGate.isEligibleForDirectReuse(status));
    }

    @Test
    @DisplayName("Candidate with CRITICAL quality finding is BLOCKED")
    void testBlockedByCriticalQuality() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "Vuln.java",
                "Vuln.badSql()", "badSql", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void badSql()", "void", 0
        );
        QualityFindingEntity finding = new QualityFindingEntity(
                UUID.randomUUID(), repoId, analysisId, "Vuln.java", sym.getId(),
                "SQL_INJECTION", Severity.CRITICAL, "SQL Injection risk",
                "Concatenation detected", 5, "badSql"
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.90, null, null, List.of(finding), List.of(), 1, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 0.1);
        assertEquals(SecurityGateStatus.BLOCKED, status);
        assertFalse(securityGate.isEligibleForDirectReuse(status));
    }

    @Test
    @DisplayName("Candidate with MEDIUM quality finding is marked CAUTION")
    void testCautionByMediumQuality() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "Warn.java",
                "Warn.suboptimal()", "suboptimal", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void suboptimal()", "void", 0
        );
        QualityFindingEntity finding = new QualityFindingEntity(
                UUID.randomUUID(), repoId, analysisId, "Warn.java", sym.getId(),
                "RESOURCE_LEAK", Severity.MEDIUM, "Potential unclosed stream",
                "Stream not closed", 5, "suboptimal"
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.80, null, null, List.of(finding), List.of(), 1, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 0.75);
        assertEquals(SecurityGateStatus.CAUTION, status);
        assertFalse(securityGate.isEligibleForDirectReuse(status));
    }

    @Test
    @DisplayName("Candidate with CRITICAL or HIGH security finding is BLOCKED")
    void testBlockedBySecurityFinding() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "SqlHelper.java",
                "SqlHelper.raw()", "raw", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void raw()", "void", 0
        );
        SecurityFindingEntity secFinding = new SecurityFindingEntity(
                UUID.randomUUID(), repoId, analysisId, null,
                "SEC_SQL_INJECTION", Severity.CRITICAL, SecurityCategory.INJECTION,
                "SQL Injection risk", "Description", "Use parameterized queries",
                "SqlHelper.java", sym.getId(), 5, 5, "raw query", "HIGH", FindingStatus.OPEN
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.95, null, null, List.of(), List.of(), List.of(secFinding), 2, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 0.9);
        assertEquals(SecurityGateStatus.BLOCKED, status);
        assertFalse(securityGate.isEligibleForDirectReuse(status));
    }

    @Test
    @DisplayName("Candidate with MEDIUM security finding is marked CAUTION")
    void testCautionByMediumSecurityFinding() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "AdminCtrl.java",
                "AdminCtrl.endpoint()", "endpoint", SymbolKind.METHOD,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void endpoint()", "void", 0
        );
        SecurityFindingEntity secFinding = new SecurityFindingEntity(
                UUID.randomUUID(), repoId, analysisId, null,
                "SEC_ENDPOINT_MISSING_AUTH", Severity.MEDIUM, SecurityCategory.AUTHORIZATION,
                "Endpoint missing authorization", "Description", "Add @PreAuthorize",
                "AdminCtrl.java", sym.getId(), 5, 5, "@GetMapping", "HIGH", FindingStatus.OPEN
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.85, null, null, List.of(), List.of(), List.of(secFinding), 1, 0
        );

        SecurityGateStatus status = securityGate.evaluate(candidate, 0.85);
        assertEquals(SecurityGateStatus.CAUTION, status);
        assertFalse(securityGate.isEligibleForDirectReuse(status));
    }
}
