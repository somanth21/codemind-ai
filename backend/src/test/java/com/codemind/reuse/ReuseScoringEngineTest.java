package com.codemind.reuse;

import com.codemind.domain.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class ReuseScoringEngineTest {

    private ReuseScoringConfig config;
    private ReuseScoringEngine scoringEngine;

    @BeforeEach
    void setUp() {
        config = new ReuseScoringConfig();
        scoringEngine = new ReuseScoringEngine(config);
    }

    @Test
    @DisplayName("Score candidate with high relevance, clean metrics, and callers")
    void testScoreCandidateHighRelevance() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/StringUtils.java",
                "com.example.StringUtils.capitalize(String)", "capitalize", SymbolKind.METHOD,
                null, 10, 20, SymbolVisibility.PUBLIC, true, false, false,
                "String capitalize(String str)", "String", 1
        );
        SymbolMetricsEntity metrics = new SymbolMetricsEntity(
                UUID.randomUUID(), repoId, analysisId, sym.getId(),
                10, 2, 1, 1, 15.0, 90.0
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 1.0, metrics, null, List.of(), List.of(), 5, 1
        );

        ReuseScoringEngine.CandidateScores scores = scoringEngine.scoreCandidate(candidate, "capitalize");

        assertEquals(1.0, scores.functionalRelevance());
        assertTrue(scores.overallScore() >= 0.80, "Composite score should be high for clean exact match");
        assertEquals(1.0, scores.securityScore(), "Zero findings should result in security score 1.0");
        assertTrue(scores.maintainabilityScore() >= 0.85);
        assertTrue(scores.complexityPenalty() < 0.20);
    }

    @Test
    @DisplayName("Candidate with secret findings receives security score 0.0")
    void testScoreCandidateWithSecret() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/Config.java",
                "com.example.Config.getToken()", "getToken", SymbolKind.METHOD,
                null, 10, 20, SymbolVisibility.PUBLIC, false, false, false,
                "String getToken()", "String", 0
        );
        SecretFindingEntity secret = new SecretFindingEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/Config.java",
                "API_KEY", Severity.CRITICAL, "HIGH", 12, "api_key_12345"
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 1.0, null, null, List.of(), List.of(secret), 2, 1
        );

        ReuseScoringEngine.CandidateScores scores = scoringEngine.scoreCandidate(candidate, "getToken");

        assertEquals(0.0, scores.securityScore(), "Security score must be 0.0 when secrets are present");
        assertTrue(scores.overallScore() < 0.75, "Overall score must be penalized when secrets are present");
    }

    @Test
    @DisplayName("Scoring is strictly deterministic across multiple runs")
    void testScoringDeterminism() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();
        SymbolEntity sym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/MathHelper.java",
                "com.example.MathHelper.gcd(int, int)", "gcd", SymbolKind.METHOD,
                null, 5, 15, SymbolVisibility.PUBLIC, true, false, false,
                "int gcd(int a, int b)", "int", 2
        );
        SymbolMetricsEntity metrics = new SymbolMetricsEntity(
                UUID.randomUUID(), repoId, analysisId, sym.getId(),
                10, 3, 1, 2, 20.0, 85.0
        );
        ReuseCandidateService.DiscoveredCandidate candidate = new ReuseCandidateService.DiscoveredCandidate(
                sym, 0.85, metrics, null, List.of(), List.of(), 3, 0
        );

        ReuseScoringEngine.CandidateScores scoreRun1 = scoringEngine.scoreCandidate(candidate, "greatest common divisor");
        ReuseScoringEngine.CandidateScores scoreRun2 = scoringEngine.scoreCandidate(candidate, "greatest common divisor");

        assertEquals(scoreRun1.overallScore(), scoreRun2.overallScore());
        assertEquals(scoreRun1.functionalRelevance(), scoreRun2.functionalRelevance());
        assertEquals(scoreRun1.maintainabilityScore(), scoreRun2.maintainabilityScore());
        assertEquals(scoreRun1.complexityPenalty(), scoreRun2.complexityPenalty());
        assertEquals(scoreRun1.securityScore(), scoreRun2.securityScore());
    }
}
