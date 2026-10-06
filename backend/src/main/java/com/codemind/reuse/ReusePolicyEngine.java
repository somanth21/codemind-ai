package com.codemind.reuse;

import com.codemind.domain.model.CandidateType;
import com.codemind.domain.model.ReuseDecision;
import com.codemind.domain.model.SecurityGateStatus;
import com.codemind.domain.model.SymbolKind;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ReusePolicyEngine {

    private final ReuseScoringConfig config;

    public record EvaluatedCandidate(
            ReuseCandidateService.DiscoveredCandidate candidate,
            ReuseScoringEngine.CandidateScores scores,
            SecurityGateStatus securityGate,
            CandidateType candidateType
    ) {}

    public ReusePolicyEngine(ReuseScoringConfig config) {
        this.config = config;
    }

    public CandidateType classifyCandidate(
            ReuseCandidateService.DiscoveredCandidate candidate,
            ReuseScoringEngine.CandidateScores scores,
            SecurityGateStatus securityGate
    ) {
        // Blocked candidates are never recommended for reuse
        if (securityGate == SecurityGateStatus.BLOCKED) {
            return CandidateType.REJECT;
        }

        // Below floor threshold is rejected
        if (scores.overallScore() < config.getThresholdRelevanceFloor()) {
            return CandidateType.REJECT;
        }

        // Abstract classes or interfaces cannot be called directly; they must be extended
        if (candidate.symbol.isAbstract() || candidate.symbol.getKind() == SymbolKind.INTERFACE) {
            if (scores.overallScore() >= config.getThresholdAdaptationScore()) {
                return CandidateType.EXTEND;
            }
            return CandidateType.REJECT;
        }

        // Direct reuse requires SAFE security, top-tier score and high functional relevance
        if (securityGate == SecurityGateStatus.SAFE
                && scores.overallScore() >= config.getThresholdDirectReuseScore()
                && candidate.functionalRelevance >= config.getThresholdDirectRelevance()) {
            return CandidateType.DIRECT_REUSE;
        }

        // Concrete class candidates with good score are suitable for extension
        if (candidate.symbol.getKind() == SymbolKind.CLASS
                && scores.overallScore() >= config.getThresholdAdaptationScore()) {
            return CandidateType.EXTEND;
        }

        // Adaptation threshold met
        if (scores.overallScore() >= config.getThresholdAdaptationScore()
                && candidate.functionalRelevance >= config.getThresholdAdaptationRelevance()) {
            return CandidateType.ADAPT;
        }

        return CandidateType.REJECT;
    }

    public ReuseDecision determineRepositoryDecision(List<EvaluatedCandidate> evaluatedCandidates, String query) {
        if (evaluatedCandidates == null || evaluatedCandidates.isEmpty()) {
            return ReuseDecision.CREATE_NEW;
        }

        List<EvaluatedCandidate> validCandidates = evaluatedCandidates.stream()
                .filter(c -> c.candidateType() != CandidateType.REJECT)
                .sorted(Comparator.comparingDouble((EvaluatedCandidate c) -> c.scores().overallScore()).reversed())
                .collect(Collectors.toList());

        if (validCandidates.isEmpty()) {
            return ReuseDecision.CREATE_NEW;
        }

        EvaluatedCandidate top = validCandidates.get(0);

        // If top candidate is directly reusable
        if (top.candidateType() == CandidateType.DIRECT_REUSE) {
            return ReuseDecision.REUSE_DIRECTLY;
        }

        // Check if query implies composition of multiple components
        if (validCandidates.size() >= 2) {
            EvaluatedCandidate second = validCandidates.get(1);
            boolean bothStrong = top.scores().overallScore() >= 0.55 && second.scores().overallScore() >= 0.50;
            boolean differentFilesOrSymbols = !top.candidate().symbol.getFilePath().equals(second.candidate().symbol.getFilePath())
                    || !top.candidate().symbol.getName().equals(second.candidate().symbol.getName());

            String lowerQuery = query.toLowerCase();
            boolean compositionCue = lowerQuery.contains(" and ") || lowerQuery.contains(" with ")
                    || lowerQuery.contains("pipeline") || lowerQuery.contains("service")
                    || lowerQuery.contains("facade") || lowerQuery.contains("handler");

            if (bothStrong && differentFilesOrSymbols && (compositionCue || validCandidates.size() >= 3)) {
                return ReuseDecision.COMPOSE_EXISTING_COMPONENTS;
            }
        }

        if (top.candidateType() == CandidateType.EXTEND) {
            return ReuseDecision.EXTEND_EXISTING_COMPONENT;
        }

        if (top.candidateType() == CandidateType.ADAPT) {
            return ReuseDecision.REUSE_WITH_ADAPTATION;
        }

        return ReuseDecision.CREATE_NEW;
    }

    public double calculateConfidence(ReuseDecision decision, List<EvaluatedCandidate> evaluatedCandidates) {
        if (evaluatedCandidates == null || evaluatedCandidates.isEmpty()) {
            return 0.85;
        }

        List<EvaluatedCandidate> valid = evaluatedCandidates.stream()
                .filter(c -> c.candidateType() != CandidateType.REJECT)
                .sorted(Comparator.comparingDouble((EvaluatedCandidate c) -> c.scores().overallScore()).reversed())
                .collect(Collectors.toList());

        if (decision == ReuseDecision.CREATE_NEW) {
            if (valid.isEmpty()) {
                return 0.90;
            }
            // If best match was close to threshold, confidence is lower
            double topScore = valid.get(0).scores().overallScore();
            return Math.round(Math.max(0.50, 1.0 - topScore) * 100.0) / 100.0;
        }

        if (valid.isEmpty()) {
            return 0.50;
        }

        if (decision == ReuseDecision.COMPOSE_EXISTING_COMPONENTS && valid.size() >= 2) {
            double avg = (valid.get(0).scores().overallScore() + valid.get(1).scores().overallScore()) / 2.0;
            return Math.round(avg * 100.0) / 100.0;
        }

        return Math.round(valid.get(0).scores().overallScore() * 100.0) / 100.0;
    }
}
