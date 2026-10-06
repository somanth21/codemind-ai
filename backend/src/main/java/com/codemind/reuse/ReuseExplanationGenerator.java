package com.codemind.reuse;

import com.codemind.domain.model.*;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ReuseExplanationGenerator {

    public record CandidateExplanation(
            String summary,
            List<String> positiveSignals,
            List<String> negativeSignals,
            List<ReuseEvidenceEntity> evidenceList
    ) {}

    public CandidateExplanation generateCandidateExplanation(
            UUID candidateId,
            ReuseCandidateService.DiscoveredCandidate candidate,
            ReuseScoringEngine.CandidateScores scores,
            SecurityGateStatus securityGate,
            CandidateType candidateType
    ) {
        List<String> positiveSignals = new ArrayList<>();
        List<String> negativeSignals = new ArrayList<>();
        List<ReuseEvidenceEntity> evidence = new ArrayList<>();

        // 1. Symbol Declaration Evidence
        evidence.add(new ReuseEvidenceEntity(
                UUID.randomUUID(),
                candidateId,
                ReuseEvidenceType.SYMBOL_DECLARATION,
                String.format("Symbol '%s' (%s) located at %s:%d-%d",
                        candidate.symbol.getName(),
                        candidate.symbol.getKind(),
                        candidate.symbol.getFilePath(),
                        candidate.symbol.getStartLine(),
                        candidate.symbol.getEndLine()),
                candidate.symbol.getFilePath(),
                candidate.symbol.getStartLine(),
                candidate.symbol.getEndLine(),
                scores.functionalRelevance()
        ));

        // Functional Relevance signals
        if (scores.functionalRelevance() >= 0.85) {
            positiveSignals.add(String.format("High functional relevance (%.0f%%) matching query intent", scores.functionalRelevance() * 100));
        } else if (scores.functionalRelevance() >= 0.50) {
            positiveSignals.add(String.format("Moderate functional relevance (%.0f%%) with shared terminology", scores.functionalRelevance() * 100));
        } else {
            negativeSignals.add(String.format("Low functional relevance (%.0f%%) requires verification", scores.functionalRelevance() * 100));
        }

        // Structural signals
        if (scores.structuralSimilarity() >= 0.70) {
            positiveSignals.add(String.format("Compatible structural signature with appropriate parameter profile"));
        } else {
            negativeSignals.add("Parameter or return type differences may require signature adaptation");
        }

        // Caller Usage Evidence
        if (candidate.callerCount > 0) {
            positiveSignals.add(String.format("Active in codebase with %d caller(s)", candidate.callerCount));
            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.CALLER_USAGE,
                    String.format("Referenced by %d caller(s) across the repository", candidate.callerCount),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    (double) candidate.callerCount
            ));
        } else {
            negativeSignals.add("No existing callers in repository; component appears unreferenced");
        }

        // Callee Dependency Evidence
        if (candidate.calleeCount > 0) {
            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.CALLEE_DEPENDENCY,
                    String.format("Invokes %d external method/function dependencies", candidate.calleeCount),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    (double) candidate.calleeCount
            ));
            if (candidate.calleeCount > 8) {
                negativeSignals.add(String.format("High coupling: depends on %d callee methods", candidate.calleeCount));
            }
        }

        // Quality Metric Evidence
        if (candidate.symbolMetrics != null || candidate.fileMetrics != null) {
            double mi = scores.maintainabilityScore() * 100.0;
            double cc = scores.complexityPenalty() * 25.0;

            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.QUALITY_METRIC,
                    String.format("Maintainability Index: %.1f, Cyclomatic Complexity: %.0f", mi, cc),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    mi
            ));

            if (scores.maintainabilityScore() >= 0.75) {
                positiveSignals.add(String.format("High maintainability index (%.1f)", mi));
            } else if (scores.maintainabilityScore() < 0.50) {
                negativeSignals.add(String.format("Low maintainability index (%.1f)", mi));
            }

            if (scores.complexityPenalty() > 0.60) {
                negativeSignals.add(String.format("Elevated cyclomatic complexity (approx. %.0f)", cc));
            } else if (scores.complexityPenalty() <= 0.20) {
                positiveSignals.add("Clean, low-complexity execution flow");
            }
        }

        // Security Findings Evidence
        if (!candidate.secretFindings.isEmpty()) {
            negativeSignals.add(String.format("CRITICAL SECURITY RISK: %d hardcoded secret(s) detected in file", candidate.secretFindings.size()));
            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.SECURITY_FINDING,
                    String.format("File contains %d hardcoded secrets", candidate.secretFindings.size()),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    (double) candidate.secretFindings.size()
            ));
        }

        if (!candidate.qualityFindings.isEmpty()) {
            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.SECURITY_FINDING,
                    String.format("Contains %d static quality/security finding(s)", candidate.qualityFindings.size()),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    (double) candidate.qualityFindings.size()
            ));
            long majorOrWorse = candidate.qualityFindings.stream()
                    .filter(q -> q.getSeverity() == Severity.HIGH || q.getSeverity() == Severity.CRITICAL)
                    .count();
            if (majorOrWorse > 0) {
                negativeSignals.add(String.format("%d high/critical static analysis finding(s) detected", majorOrWorse));
            }
        } else if (candidate.secretFindings.isEmpty()) {
            positiveSignals.add("Clean security audit: 0 secrets or static quality warnings");
        }

        // Duplication signal
        if (scores.duplicationRisk() >= 0.70) {
            evidence.add(new ReuseEvidenceEntity(
                    UUID.randomUUID(),
                    candidateId,
                    ReuseEvidenceType.DUPLICATION_SIGNAL,
                    String.format("Duplication prevention: re-implementing would duplicate %.0f%% existing logic", scores.duplicationRisk() * 100),
                    candidate.symbol.getFilePath(),
                    candidate.symbol.getStartLine(),
                    candidate.symbol.getEndLine(),
                    scores.duplicationRisk()
            ));
            positiveSignals.add("Direct reuse avoids redundant code duplication");
        }

        String summary = buildCandidateSummary(candidate, scores, securityGate, candidateType);

        return new CandidateExplanation(summary, positiveSignals, negativeSignals, evidence);
    }

    private String buildCandidateSummary(
            ReuseCandidateService.DiscoveredCandidate candidate,
            ReuseScoringEngine.CandidateScores scores,
            SecurityGateStatus securityGate,
            CandidateType candidateType
    ) {
        if (securityGate == SecurityGateStatus.BLOCKED) {
            return String.format("Candidate '%s' is BLOCKED by security gate due to secrets or critical vulnerabilities.",
                    candidate.symbol.getName());
        }

        switch (candidateType) {
            case DIRECT_REUSE:
                return String.format("Recommend DIRECT REUSE of '%s' (Overall score: %.2f, Relevance: %.2f). Logic directly fulfills requirements with minimal risk.",
                        candidate.symbol.getName(), scores.overallScore(), scores.functionalRelevance());
            case EXTEND:
                return String.format("Recommend EXTENDING '%s' (Overall score: %.2f). Target is a class/interface that provides extensible foundation.",
                        candidate.symbol.getName(), scores.overallScore());
            case ADAPT:
                return String.format("Recommend ADAPTING '%s' (Overall score: %.2f, Relevance: %.2f). Modify parameters or wrap logic to match exact specifications.",
                        candidate.symbol.getName(), scores.overallScore(), scores.functionalRelevance());
            case COMPOSE:
                return String.format("Candidate '%s' can be composed with complementary components (Score: %.2f).",
                        candidate.symbol.getName(), scores.overallScore());
            case REJECT:
            default:
                return String.format("Candidate '%s' was rejected (Score: %.2f below threshold or excessive adaptation cost).",
                        candidate.symbol.getName(), scores.overallScore());
        }
    }

    public String generateRepositoryExplanation(
            ReuseDecision decision,
            List<ReusePolicyEngine.EvaluatedCandidate> candidates,
            String query
    ) {
        StringBuilder sb = new StringBuilder();
        switch (decision) {
            case REUSE_DIRECTLY:
                if (!candidates.isEmpty()) {
                    ReusePolicyEngine.EvaluatedCandidate top = candidates.get(0);
                    sb.append(String.format("Found existing component '%s' (%s) in %s with %.0f%% functional relevance and clean security profile. Reusing this component directly prevents code duplication and maintains architectural consistency.",
                            top.candidate().symbol.getName(),
                            top.candidate().symbol.getKind(),
                            top.candidate().symbol.getFilePath(),
                            top.scores().functionalRelevance() * 100));
                }
                break;
            case COMPOSE_EXISTING_COMPONENTS:
                sb.append("Recommended composition of multiple existing repository components to fulfill the request. Combining existing verified modules eliminates the need to build a new monolithic solution.");
                break;
            case EXTEND_EXISTING_COMPONENT:
                if (!candidates.isEmpty()) {
                    ReusePolicyEngine.EvaluatedCandidate top = candidates.get(0);
                    sb.append(String.format("Recommended extending existing component '%s' (%s) in %s. Subclassing or implementing this interface leverages existing abstractions while accommodating new behavior.",
                            top.candidate().symbol.getName(),
                            top.candidate().symbol.getKind(),
                            top.candidate().symbol.getFilePath()));
                }
                break;
            case REUSE_WITH_ADAPTATION:
                if (!candidates.isEmpty()) {
                    ReusePolicyEngine.EvaluatedCandidate top = candidates.get(0);
                    sb.append(String.format("Recommended adapting existing component '%s' in %s. The core algorithmic logic is present but requires interface or parameter adjustments.",
                            top.candidate().symbol.getName(),
                            top.candidate().symbol.getFilePath()));
                }
                break;
            case CREATE_NEW:
            default:
                sb.append("No sufficiently matching, safe, or adaptable existing repository components were found. Recommended implementing a new component to satisfy specifications without introducing architectural pollution.");
                break;
        }
        return sb.toString();
    }
}
