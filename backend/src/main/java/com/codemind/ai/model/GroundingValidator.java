package com.codemind.ai.model;

import com.codemind.ai.evidence.EvidenceChunk;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Validates citation grounding and deterministic invariants in LLM outputs.
 * Verifies that all cited evidence IDs exist in the provided evidence set and checks security gate compliance.
 */
@Component
public class GroundingValidator {

    private static final Logger log = LoggerFactory.getLogger(GroundingValidator.class);

    public record ValidationResult(
            boolean valid,
            double citationCoverage,
            List<String> invalidCitations,
            List<String> warnings,
            boolean securityGateViolated
    ) {}

    public ValidationResult validate(
            GroundedReasoningResponse response,
            List<EvidenceChunk> providedEvidence,
            boolean isSecurityBlocked
    ) {
        Set<String> validIds = providedEvidence != null
                ? providedEvidence.stream().map(EvidenceChunk::evidenceId).collect(Collectors.toSet())
                : Collections.emptySet();

        List<String> invalidCitations = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        int totalClaims = response.reasoning().size();
        int claimsWithValidCitations = 0;

        for (ReasoningStep step : response.reasoning()) {
            boolean stepHasValid = false;
            if (step.evidenceIds().isEmpty()) {
                warnings.add("Claim without evidence citation: \"" + truncate(step.claim(), 60) + "\"");
            } else {
                boolean allValid = true;
                for (String evId : step.evidenceIds()) {
                    if (!validIds.contains(evId)) {
                        invalidCitations.add(evId);
                        allValid = false;
                    }
                }
                if (allValid) {
                    claimsWithValidCitations++;
                    stepHasValid = true;
                }
            }
        }

        double citationCoverage = totalClaims > 0
                ? (double) claimsWithValidCitations / totalClaims
                : 1.0;

        // Security Gate Invariant Check:
        // If candidate/decision was BLOCKED, recommendation must not propose direct reuse
        boolean securityGateViolated = false;
        if (isSecurityBlocked) {
            String lowerRec = response.recommendation().toLowerCase();
            if (lowerRec.contains("reuse directly") || lowerRec.contains("safe to reuse") || lowerRec.contains("adopt without changes")) {
                securityGateViolated = true;
                warnings.add("SECURITY VIOLATION: Deterministic analysis marked candidate BLOCKED, but LLM suggested direct reuse.");
                log.warn("Security gate invariant violation detected in LLM response: {}", response.recommendation());
            }
        }

        boolean valid = invalidCitations.isEmpty() && !securityGateViolated;

        return new ValidationResult(
                valid,
                citationCoverage,
                invalidCitations,
                warnings,
                securityGateViolated
        );
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }
}
