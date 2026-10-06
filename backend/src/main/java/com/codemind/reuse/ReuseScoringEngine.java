package com.codemind.reuse;

import com.codemind.domain.model.Severity;
import com.codemind.domain.model.SymbolKind;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ReuseScoringEngine {

    private final ReuseScoringConfig config;

    public record CandidateScores(
            double overallScore,
            double functionalRelevance,
            double structuralSimilarity,
            double maintainabilityScore,
            double complexityPenalty,
            double securityScore,
            double modificationEffort,
            double dependencyImpact,
            double duplicationRisk
    ) {}

    public ReuseScoringEngine(ReuseScoringConfig config) {
        this.config = config;
    }

    public CandidateScores scoreCandidate(ReuseCandidateService.DiscoveredCandidate candidate, String query) {
        double functionalRelevance = candidate.functionalRelevance;
        double structuralSimilarity = calculateStructuralSimilarity(candidate, query);
        double maintainabilityScore = calculateMaintainabilityScore(candidate);
        double complexityPenalty = calculateComplexityPenalty(candidate);
        double securityScore = calculateSecurityScore(candidate);
        double modificationEffort = calculateModificationEffort(candidate, functionalRelevance);
        double dependencyImpact = calculateDependencyImpact(candidate);
        double duplicationRisk = calculateDuplicationRisk(functionalRelevance);

        // Weighted composite calculation
        // Penalties are inverted to positive factors (1 - penalty) so composite is strictly in [0, 1]
        double composite =
                (config.getWeightFunctionalRelevance() * functionalRelevance) +
                (config.getWeightStructuralSimilarity() * structuralSimilarity) +
                (config.getWeightMaintainability() * maintainabilityScore) +
                (config.getWeightSecurity() * securityScore) +
                (config.getWeightComplexity() * (1.0 - complexityPenalty)) +
                (config.getWeightModificationEffort() * (1.0 - modificationEffort));

        // Severe security risk dampens overall viability
        composite = composite * (0.40 + 0.60 * securityScore);

        double roundedComposite = Math.round(Math.max(0.0, Math.min(1.0, composite)) * 1000.0) / 1000.0;

        return new CandidateScores(
                roundedComposite,
                round3(functionalRelevance),
                round3(structuralSimilarity),
                round3(maintainabilityScore),
                round3(complexityPenalty),
                round3(securityScore),
                round3(modificationEffort),
                round3(dependencyImpact),
                round3(duplicationRisk)
        );
    }

    private double calculateStructuralSimilarity(ReuseCandidateService.DiscoveredCandidate candidate, String query) {
        double score = 0.50; // baseline

        // Method-level or Class-level target
        if (candidate.symbol.getKind() == SymbolKind.METHOD || candidate.symbol.getKind() == SymbolKind.CONSTRUCTOR) {
            score += 0.20;
            // If signature is present, evaluate parameter shape
            if (candidate.symbol.getSignature() != null) {
                int paramCount = countParameters(candidate.symbol.getSignature());
                if (paramCount >= 1 && paramCount <= 4) {
                    score += 0.15; // standard callable structure
                } else if (paramCount == 0) {
                    score += 0.10;
                }
            }
        } else if (candidate.symbol.getKind() == SymbolKind.CLASS || candidate.symbol.getKind() == SymbolKind.INTERFACE) {
            score += 0.25;
        }

        // Active usage validation
        if (candidate.callerCount > 0) {
            score += Math.min(0.15, candidate.callerCount * 0.05);
        }

        return Math.max(0.0, Math.min(1.0, score));
    }

    private double calculateMaintainabilityScore(ReuseCandidateService.DiscoveredCandidate candidate) {
        if (candidate.symbolMetrics != null && candidate.symbolMetrics.getMaintainabilityIndex() > 0) {
            return Math.max(0.0, Math.min(1.0, candidate.symbolMetrics.getMaintainabilityIndex() / 100.0));
        }
        if (candidate.fileMetrics != null && candidate.fileMetrics.getMaintainabilityIndex() > 0) {
            return Math.max(0.0, Math.min(1.0, candidate.fileMetrics.getMaintainabilityIndex() / 100.0));
        }
        return 0.70; // Reasonable default if metrics absent
    }

    private double calculateComplexityPenalty(ReuseCandidateService.DiscoveredCandidate candidate) {
        int cc = 1;
        if (candidate.symbolMetrics != null && candidate.symbolMetrics.getCyclomaticComplexity() > 0) {
            cc = candidate.symbolMetrics.getCyclomaticComplexity();
        } else if (candidate.fileMetrics != null && candidate.fileMetrics.getCyclomaticComplexity() > 0) {
            cc = Math.max(1, candidate.fileMetrics.getCyclomaticComplexity() / Math.max(1, candidate.fileMetrics.getMethodCount()));
        }

        // CC <= 5: minimal penalty (0.0 - 0.2)
        // CC 5-15: moderate penalty (0.2 - 0.6)
        // CC > 25: maximum penalty (1.0)
        return Math.max(0.0, Math.min(1.0, cc / 25.0));
    }

    private double calculateSecurityScore(ReuseCandidateService.DiscoveredCandidate candidate) {
        // Any secret in candidate's file is zero tolerance
        if (!candidate.secretFindings.isEmpty()) {
            return 0.0;
        }

        if (candidate.qualityFindings.isEmpty()) {
            return 1.0;
        }

        long criticalOrHigh = candidate.qualityFindings.stream()
                .filter(q -> q.getSeverity() == Severity.CRITICAL || q.getSeverity() == Severity.HIGH)
                .count();
        if (criticalOrHigh > 0) {
            return 0.10;
        }

        long medium = candidate.qualityFindings.stream()
                .filter(q -> q.getSeverity() == Severity.MEDIUM)
                .count();
        if (medium > 0) {
            return Math.max(0.20, 1.0 - (medium * 0.25));
        }

        long minor = candidate.qualityFindings.size();
        return Math.max(0.70, 1.0 - (minor * 0.05));
    }

    private double calculateModificationEffort(ReuseCandidateService.DiscoveredCandidate candidate, double relevance) {
        // High functional relevance implies lower modification effort
        double effort = (1.0 - relevance) * 0.50;

        // Size factor: larger methods require more effort to understand and modify
        int loc = 10;
        if (candidate.symbol.getEndLine() != null && candidate.symbol.getStartLine() != null) {
            loc = candidate.symbol.getEndLine() - candidate.symbol.getStartLine() + 1;
        }
        if (loc > 200) {
            effort += 0.30;
        } else if (loc > 80) {
            effort += 0.15;
        }

        // Callers factor: if method has callers, changing it risks breaking existing callers
        if (candidate.callerCount > 5) {
            effort += 0.10;
        }

        return Math.max(0.0, Math.min(1.0, effort));
    }

    private double calculateDependencyImpact(ReuseCandidateService.DiscoveredCandidate candidate) {
        // High callee count means candidate pulls in many dependencies
        int callees = candidate.calleeCount;
        return Math.max(0.0, Math.min(1.0, callees / 10.0));
    }

    private double calculateDuplicationRisk(double relevance) {
        // Writing new code when an existing method already solves 80%+ of the query creates duplication
        if (relevance >= 0.80) {
            return relevance;
        } else if (relevance >= 0.50) {
            return relevance * 0.70;
        }
        return 0.10;
    }

    private int countParameters(String signature) {
        int openParen = signature.indexOf('(');
        int closeParen = signature.indexOf(')', openParen);
        if (openParen == -1 || closeParen == -1 || closeParen == openParen + 1) {
            return 0;
        }
        String params = signature.substring(openParen + 1, closeParen).trim();
        if (params.isEmpty()) {
            return 0;
        }
        return params.split(",").length;
    }

    private double round3(double val) {
        return Math.round(val * 1000.0) / 1000.0;
    }
}
