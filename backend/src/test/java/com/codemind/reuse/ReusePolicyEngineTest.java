package com.codemind.reuse;

import com.codemind.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReusePolicyEngineTest {

    private ReuseScoringConfig config;
    private ReusePolicyEngine policyEngine;

    @BeforeEach
    void setUp() {
        config = new ReuseScoringConfig();
        policyEngine = new ReusePolicyEngine(config);
    }

    private SymbolEntity createSymbol(String name, SymbolKind kind) {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        return new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, name + ".java",
                "com.example." + name, name, kind,
                null, 1, 10, SymbolVisibility.PUBLIC, false, false, false,
                "void " + name + "()", "void", 0
        );
    }

    @Test
    @DisplayName("Classify candidate: DIRECT_REUSE when safe, high score, and high relevance")
    void testClassifyDirectReuse() {
        SymbolEntity sym = createSymbol("parseJson", SymbolKind.METHOD);
        ReuseCandidateService.DiscoveredCandidate dc = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.95, null, null, List.of(), List.of(), 5, 0
        );
        ReuseScoringEngine.CandidateScores scores = new ReuseScoringEngine.CandidateScores(
                0.88, 0.95, 0.85, 0.90, 0.10, 1.0, 0.10, 0.0, 0.95
        );

        CandidateType type = policyEngine.classifyCandidate(dc, scores, SecurityGateStatus.SAFE);
        assertEquals(CandidateType.DIRECT_REUSE, type);
    }

    @Test
    @DisplayName("Classify candidate: REJECT when blocked by security gate, regardless of high score")
    void testClassifyBlockedCandidateRejected() {
        SymbolEntity sym = createSymbol("getKey", SymbolKind.METHOD);
        ReuseCandidateService.DiscoveredCandidate dc = new ReuseCandidateService.DiscoveredCandidate(
                sym, 1.0, null, null, List.of(), List.of(), 10, 0
        );
        ReuseScoringEngine.CandidateScores scores = new ReuseScoringEngine.CandidateScores(
                0.90, 1.0, 0.90, 0.90, 0.05, 0.0, 0.05, 0.0, 1.0
        );

        CandidateType type = policyEngine.classifyCandidate(dc, scores, SecurityGateStatus.BLOCKED);
        assertEquals(CandidateType.REJECT, type);
    }

    @Test
    @DisplayName("Classify candidate: EXTEND when candidate is an extensible class")
    void testClassifyExtend() {
        SymbolEntity sym = createSymbol("BaseService", SymbolKind.CLASS);
        ReuseCandidateService.DiscoveredCandidate dc = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.60, null, null, List.of(), List.of(), 2, 0
        );
        ReuseScoringEngine.CandidateScores scores = new ReuseScoringEngine.CandidateScores(
                0.62, 0.60, 0.70, 0.80, 0.20, 1.0, 0.30, 0.1, 0.60
        );

        CandidateType type = policyEngine.classifyCandidate(dc, scores, SecurityGateStatus.SAFE);
        assertEquals(CandidateType.EXTEND, type);
    }

    @Test
    @DisplayName("Determine repository decision: REUSE_DIRECTLY when top candidate is DIRECT_REUSE")
    void testDetermineDirectReuseDecision() {
        SymbolEntity sym = createSymbol("parseJson", SymbolKind.METHOD);
        ReuseCandidateService.DiscoveredCandidate dc = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.95, null, null, List.of(), List.of(), 5, 0
        );
        ReuseScoringEngine.CandidateScores scores = new ReuseScoringEngine.CandidateScores(
                0.88, 0.95, 0.85, 0.90, 0.10, 1.0, 0.10, 0.0, 0.95
        );
        ReusePolicyEngine.EvaluatedCandidate ec = new ReusePolicyEngine.EvaluatedCandidate(
                dc, scores, SecurityGateStatus.SAFE, CandidateType.DIRECT_REUSE
        );

        ReuseDecision decision = policyEngine.determineRepositoryDecision(List.of(ec), "parse json");
        assertEquals(ReuseDecision.REUSE_DIRECTLY, decision);
    }

    @Test
    @DisplayName("Determine repository decision: CREATE_NEW when candidates list is empty or rejected")
    void testDetermineCreateNewWhenEmpty() {
        ReuseDecision decision = policyEngine.determineRepositoryDecision(List.of(), "unknown feature");
        assertEquals(ReuseDecision.CREATE_NEW, decision);
    }
}
