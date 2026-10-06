package com.codemind.reuse;

import com.codemind.reuse.eval.ReuseEvaluationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ReuseEvaluationTest {

    private ReuseEvaluationService evaluationService;

    @BeforeEach
    void setUp() {
        ReuseScoringConfig config = new ReuseScoringConfig();
        ReuseScoringEngine scoringEngine = new ReuseScoringEngine(config);
        ReuseSecurityGate securityGate = new ReuseSecurityGate();
        ReusePolicyEngine policyEngine = new ReusePolicyEngine(config);
        evaluationService = new ReuseEvaluationService(config, scoringEngine, securityGate, policyEngine);
    }

    @Test
    @DisplayName("Run standard benchmark scenarios and assert accuracy and zero false reuse")
    void testStandardBenchmark() {
        ReuseEvaluationService.EvaluationMetrics metrics = evaluationService.runStandardBenchmark();

        assertEquals(5, metrics.totalScenarios());
        assertEquals(5, metrics.correctDecisions(), "All 5 benchmark scenarios must pass");
        assertEquals(1.0, metrics.decisionAccuracy(), "Decision accuracy must be 1.0 (100%)");
        assertEquals(0, metrics.falseReuseCount(), "False reuse count must be strictly 0");
        assertEquals(0.0, metrics.falseReuseRate());
        assertEquals(0, metrics.unnecessaryNewCodeCount(), "Unnecessary new code count must be 0");
        assertEquals(0.0, metrics.unnecessaryNewCodeRate());
    }
}
