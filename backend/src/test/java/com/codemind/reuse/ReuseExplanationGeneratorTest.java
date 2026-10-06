package com.codemind.reuse;

import com.codemind.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReuseExplanationGeneratorTest {

    private ReuseExplanationGenerator explanationGenerator;

    @BeforeEach
    void setUp() {
        explanationGenerator = new ReuseExplanationGenerator();
    }

    private SymbolEntity createSymbol(String name, SymbolKind kind) {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        return new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, name + ".java",
                "com.example." + name, name, kind,
                null, 10, 20, SymbolVisibility.PUBLIC, true, false, false,
                "int " + name + "(int val, int min, int max)", "int", 3
        );
    }

    @Test
    @DisplayName("Generate candidate explanation with positive signals and evidence")
    void testGenerateCandidateExplanation() {
        UUID candidateId = UUID.randomUUID();
        SymbolEntity sym = createSymbol("clamp", SymbolKind.METHOD);
        SymbolMetricsEntity metrics = new SymbolMetricsEntity(
                UUID.randomUUID(), sym.getRepositoryId(), sym.getAnalysisId(), sym.getId(),
                10, 2, 1, 3, 10.0, 85.0
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.90, metrics, null, List.of(), List.of(), 4, 1
        );
        ReuseScoringEngine.CandidateScores scores = new ReuseScoringEngine.CandidateScores(
                0.85, 0.90, 0.80, 0.85, 0.08, 1.0, 0.10, 0.10, 0.90
        );

        ReuseExplanationGenerator.CandidateExplanation expl = explanationGenerator.generateCandidateExplanation(
                candidateId, candidate, scores, SecurityGateStatus.SAFE, CandidateType.DIRECT_REUSE
        );

        assertNotNull(expl.summary());
        assertTrue(expl.summary().contains("DIRECT REUSE"));
        assertFalse(expl.positiveSignals().isEmpty());
        assertTrue(expl.positiveSignals().stream().anyMatch(s -> s.contains("High functional relevance")));
        assertTrue(expl.positiveSignals().stream().anyMatch(s -> s.contains("caller")));
        assertFalse(expl.evidenceList().isEmpty());
        assertTrue(expl.evidenceList().stream().anyMatch(e -> e.getEvidenceType() == ReuseEvidenceType.SYMBOL_DECLARATION));
        assertTrue(expl.evidenceList().stream().anyMatch(e -> e.getEvidenceType() == ReuseEvidenceType.CALLER_USAGE));
    }

    @Test
    @DisplayName("Generate repository explanation for direct reuse")
    void testGenerateRepositoryExplanation() {
        SymbolEntity sym = createSymbol("clamp", SymbolKind.METHOD);
        ReuseCandidateService.DiscoveredCandidate dc = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.95, null, null, List.of(), List.of(), 2, 0
        );
        ReuseScoringEngine.CandidateScores sc = new ReuseScoringEngine.CandidateScores(
                0.88, 0.95, 0.80, 0.85, 0.08, 1.0, 0.10, 0.0, 0.95
        );
        ReusePolicyEngine.EvaluatedCandidate ec = new ReusePolicyEngine.EvaluatedCandidate(
                dc, sc, SecurityGateStatus.SAFE, CandidateType.DIRECT_REUSE
        );

        String explanation = explanationGenerator.generateRepositoryExplanation(
                ReuseDecision.REUSE_DIRECTLY, List.of(ec), "clamp integer"
        );

        assertNotNull(explanation);
        assertTrue(explanation.contains("clamp"));
        assertTrue(explanation.contains("Reusing this component directly prevents code duplication"));
    }
}
