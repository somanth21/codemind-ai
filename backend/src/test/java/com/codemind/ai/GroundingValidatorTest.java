package com.codemind.ai;

import com.codemind.ai.evidence.EvidenceChunk;
import com.codemind.ai.model.GroundedReasoningResponse;
import com.codemind.ai.model.GroundingValidator;
import com.codemind.ai.model.ReasoningStep;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class GroundingValidatorTest {

    private final GroundingValidator validator = new GroundingValidator();

    private final List<EvidenceChunk> sampleEvidence = List.of(
            new EvidenceChunk("E1", UUID.randomUUID(), UUID.randomUUID(), "src/Service.java", "service", 1, 10, "code", "REUSE", 0.9),
            new EvidenceChunk("E2", UUID.randomUUID(), UUID.randomUUID(), "src/Repo.java", "repo", 1, 10, "code", "REUSE", 0.8)
    );

    @Test
    @DisplayName("Valid citations achieve 1.0 citation coverage and valid=true")
    void validCitations() {
        GroundedReasoningResponse response = new GroundedReasoningResponse(
                "Summary",
                "Recommendation",
                List.of(
                        new ReasoningStep("Claim 1 backed by E1", List.of("E1")),
                        new ReasoningStep("Claim 2 backed by E2", List.of("E2"))
                ),
                List.of(),
                0.9
        );

        GroundingValidator.ValidationResult result = validator.validate(response, sampleEvidence, false);
        assertTrue(result.valid());
        assertEquals(1.0, result.citationCoverage());
        assertTrue(result.invalidCitations().isEmpty());
        assertFalse(result.securityGateViolated());
    }

    @Test
    @DisplayName("Unknown evidence ID (e.g. E99) is detected and marks response invalid")
    void unknownEvidenceIdDetected() {
        GroundedReasoningResponse response = new GroundedReasoningResponse(
                "Summary",
                "Recommendation",
                List.of(
                        new ReasoningStep("Claim citing invented evidence", List.of("E99"))
                ),
                List.of(),
                0.9
        );

        GroundingValidator.ValidationResult result = validator.validate(response, sampleEvidence, false);
        assertFalse(result.valid());
        assertEquals(0.0, result.citationCoverage());
        assertEquals(1, result.invalidCitations().size());
        assertEquals("E99", result.invalidCitations().get(0));
    }

    @Test
    @DisplayName("Security gate violation detected when candidate is BLOCKED but LLM suggests direct reuse")
    void securityGateViolationDetected() {
        GroundedReasoningResponse response = new GroundedReasoningResponse(
                "Candidate has severe vulnerability findings.",
                "It is completely safe to reuse directly in your module.",
                List.of(
                        new ReasoningStep("Claim", List.of("E1"))
                ),
                List.of(),
                0.9
        );

        GroundingValidator.ValidationResult result = validator.validate(response, sampleEvidence, true);
        assertFalse(result.valid());
        assertTrue(result.securityGateViolated());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("SECURITY VIOLATION")));
    }

    @Test
    @DisplayName("Claims without citations generate warnings and reduce coverage")
    void claimsWithoutCitations() {
        GroundedReasoningResponse response = new GroundedReasoningResponse(
                "Summary",
                "Recommendation",
                List.of(
                        new ReasoningStep("Claim with citation", List.of("E1")),
                        new ReasoningStep("Uncited speculation", List.of())
                ),
                List.of(),
                0.85
        );

        GroundingValidator.ValidationResult result = validator.validate(response, sampleEvidence, false);
        assertTrue(result.valid()); // No invalid IDs
        assertEquals(0.5, result.citationCoverage()); // 1 out of 2 claims cited
        assertEquals(1, result.warnings().size());
    }
}
