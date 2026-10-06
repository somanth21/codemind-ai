package com.codemind.reuse.eval;

import com.codemind.domain.model.*;
import com.codemind.reuse.ReuseCandidateService;
import com.codemind.reuse.ReusePolicyEngine;
import com.codemind.reuse.ReuseScoringConfig;
import com.codemind.reuse.ReuseScoringEngine;
import com.codemind.reuse.ReuseSecurityGate;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class ReuseEvaluationService {

    private final ReuseScoringConfig config;
    private final ReuseScoringEngine scoringEngine;
    private final ReuseSecurityGate securityGate;
    private final ReusePolicyEngine policyEngine;

    public record BenchmarkScenario(
            String id,
            String description,
            String query,
            ReuseCandidateService.DiscoveredCandidate mockCandidate,
            ReuseDecision expectedDecision,
            SecurityGateStatus expectedGateStatus
    ) {}

    public record EvaluationMetrics(
            int totalScenarios,
            int correctDecisions,
            double decisionAccuracy,
            int falseReuseCount,
            double falseReuseRate,
            int unnecessaryNewCodeCount,
            double unnecessaryNewCodeRate,
            Map<String, String> scenarioResults
    ) {}

    public ReuseEvaluationService(
            ReuseScoringConfig config,
            ReuseScoringEngine scoringEngine,
            ReuseSecurityGate securityGate,
            ReusePolicyEngine policyEngine
    ) {
        this.config = config;
        this.scoringEngine = scoringEngine;
        this.securityGate = securityGate;
        this.policyEngine = policyEngine;
    }

    public EvaluationMetrics runStandardBenchmark() {
        List<BenchmarkScenario> scenarios = getStandardScenarios();
        return evaluateScenarios(scenarios);
    }

    public EvaluationMetrics evaluateScenarios(List<BenchmarkScenario> scenarios) {
        int correctDecisions = 0;
        int falseReuseCount = 0;
        int unnecessaryNewCodeCount = 0;
        Map<String, String> results = new LinkedHashMap<>();

        for (BenchmarkScenario s : scenarios) {
            List<ReusePolicyEngine.EvaluatedCandidate> evaluatedList = new ArrayList<>();

            if (s.mockCandidate != null) {
                ReuseScoringEngine.CandidateScores scores = scoringEngine.scoreCandidate(s.mockCandidate, s.query);
                SecurityGateStatus gate = securityGate.evaluate(s.mockCandidate, scores.securityScore());
                CandidateType cType = policyEngine.classifyCandidate(s.mockCandidate, scores, gate);
                evaluatedList.add(new ReusePolicyEngine.EvaluatedCandidate(s.mockCandidate, scores, gate, cType));
            }

            ReuseDecision decision = policyEngine.determineRepositoryDecision(evaluatedList, s.query);

            boolean match = (decision == s.expectedDecision);
            if (match) {
                correctDecisions++;
            }

            // False Reuse: recommended REUSE_DIRECTLY when expecting CREATE_NEW or when security is BLOCKED
            if (decision == ReuseDecision.REUSE_DIRECTLY && (s.expectedDecision == ReuseDecision.CREATE_NEW || s.expectedGateStatus == SecurityGateStatus.BLOCKED)) {
                falseReuseCount++;
            }

            // Unnecessary New Code: recommended CREATE_NEW when expecting REUSE_DIRECTLY
            if (decision == ReuseDecision.CREATE_NEW && s.expectedDecision == ReuseDecision.REUSE_DIRECTLY) {
                unnecessaryNewCodeCount++;
            }

            results.put(s.id, String.format("Expected: %s, Actual: %s, Gate: %s -> %s",
                    s.expectedDecision, decision,
                    s.mockCandidate != null ? securityGate.evaluate(s.mockCandidate, 1.0) : "N/A",
                    match ? "PASS" : "FAIL"));
        }

        int total = scenarios.size();
        double accuracy = total > 0 ? (double) correctDecisions / total : 0.0;
        double frr = total > 0 ? (double) falseReuseCount / total : 0.0;
        double uncr = total > 0 ? (double) unnecessaryNewCodeCount / total : 0.0;

        return new EvaluationMetrics(
                total,
                correctDecisions,
                Math.round(accuracy * 1000.0) / 1000.0,
                falseReuseCount,
                Math.round(frr * 1000.0) / 1000.0,
                unnecessaryNewCodeCount,
                Math.round(uncr * 1000.0) / 1000.0,
                results
        );
    }

    public List<BenchmarkScenario> getStandardScenarios() {
        UUID repoId = UUID.randomUUID();
        UUID analysisId = UUID.randomUUID();

        List<BenchmarkScenario> scenarios = new ArrayList<>();

        // Scenario 1: Exact match with clean metrics and callers -> REUSE_DIRECTLY
        SymbolEntity exactSym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/HashUtils.java",
                "com.example.HashUtils.sha256Hex(String)", "sha256Hex", SymbolKind.METHOD,
                null, 10, 25, SymbolVisibility.PUBLIC, true, false, false,
                "String sha256Hex(String input)", "String", 1
        );
        SymbolMetricsEntity cleanMetrics = new SymbolMetricsEntity(
                UUID.randomUUID(), repoId, analysisId, exactSym.getId(),
                15, 2, 1, 1, 10.0, 88.0
        );
        ReuseCandidateService.DiscoveredCandidate c1 = new ReuseCandidateService.DiscoveredCandidate(
                exactSym, 1.0, cleanMetrics, null, List.of(), List.of(), 5, 2
        );
        scenarios.add(new BenchmarkScenario(
                "SCENARIO_1_DIRECT_REUSE",
                "Exact matching helper method with high maintainability index and callers",
                "sha256Hex",
                c1,
                ReuseDecision.REUSE_DIRECTLY,
                SecurityGateStatus.SAFE
        ));

        // Scenario 2: Partial relevance with signature differences -> REUSE_WITH_ADAPTATION
        SymbolEntity adaptSym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/StringUtils.java",
                "com.example.StringUtils.formatUserToken(String, int)", "formatUserToken", SymbolKind.METHOD,
                null, 30, 55, SymbolVisibility.PUBLIC, true, false, false,
                "String formatUserToken(String user, int flag)", "String", 2
        );
        SymbolMetricsEntity adaptMetrics = new SymbolMetricsEntity(
                UUID.randomUUID(), repoId, analysisId, adaptSym.getId(),
                25, 4, 2, 2, 25.0, 75.0
        );
        ReuseCandidateService.DiscoveredCandidate c2 = new ReuseCandidateService.DiscoveredCandidate(
                adaptSym, 0.65, adaptMetrics, null, List.of(), List.of(), 2, 1
        );
        scenarios.add(new BenchmarkScenario(
                "SCENARIO_2_ADAPTATION",
                "Partial matching method requiring adaptation",
                "format user token string",
                c2,
                ReuseDecision.REUSE_WITH_ADAPTATION,
                SecurityGateStatus.SAFE
        ));

        // Scenario 3: Extensible class candidate -> EXTEND_EXISTING_COMPONENT
        SymbolEntity classSym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/AbstractExporter.java",
                "com.example.AbstractExporter", "AbstractExporter", SymbolKind.CLASS,
                null, 1, 120, SymbolVisibility.PUBLIC, false, false, true,
                "abstract class AbstractExporter", null, 0
        );
        SymbolMetricsEntity classMetrics = new SymbolMetricsEntity(
                UUID.randomUUID(), repoId, analysisId, classSym.getId(),
                120, 3, 1, 0, 80.0, 80.0
        );
        ReuseCandidateService.DiscoveredCandidate c3 = new ReuseCandidateService.DiscoveredCandidate(
                classSym, 0.70, classMetrics, null, List.of(), List.of(), 4, 3
        );
        scenarios.add(new BenchmarkScenario(
                "SCENARIO_3_EXTEND",
                "Extensible abstract class",
                "export report data exporter",
                c3,
                ReuseDecision.EXTEND_EXISTING_COMPONENT,
                SecurityGateStatus.SAFE
        ));

        // Scenario 4: High relevance but candidate file contains hardcoded secret -> MUST BLOCK (CREATE_NEW)
        SymbolEntity secretSym = new SymbolEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/AwsConfig.java",
                "com.example.AwsConfig.getAwsClient()", "getAwsClient", SymbolKind.METHOD,
                null, 15, 40, SymbolVisibility.PUBLIC, true, false, false,
                "AmazonS3 getAwsClient()", "AmazonS3", 0
        );
        SecretFindingEntity secretFinding = new SecretFindingEntity(
                UUID.randomUUID(), repoId, analysisId, "com/example/AwsConfig.java",
                "AWS_ACCESS_KEY", Severity.CRITICAL, "HIGH", 18, "AKIA****************"
        );
        ReuseCandidateService.DiscoveredCandidate c4 = new ReuseCandidateService.DiscoveredCandidate(
                secretSym, 0.95, cleanMetrics, null, List.of(), List.of(secretFinding), 3, 1
        );
        scenarios.add(new BenchmarkScenario(
                "SCENARIO_4_SECURITY_BLOCKED",
                "High relevance method but containing hardcoded secrets in file",
                "getAwsClient",
                c4,
                ReuseDecision.CREATE_NEW, // Candidate rejected due to BLOCKED security gate
                SecurityGateStatus.BLOCKED
        ));

        // Scenario 5: Completely novel domain query with 0 candidate matches -> CREATE_NEW
        scenarios.add(new BenchmarkScenario(
                "SCENARIO_5_NOVEL_REQUEST",
                "Novel functionality with no existing matches",
                "quantum cryptography key generation algorithm",
                null,
                ReuseDecision.CREATE_NEW,
                SecurityGateStatus.SAFE
        ));

        return scenarios;
    }
}
