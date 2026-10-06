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

class SecurityGatePreservationTest {

    private final GroundingValidator validator = new GroundingValidator();

    @Test
    @DisplayName("GroundedValidator enforces invariant: BLOCKED candidate cannot be recommended for direct reuse")
    void blockedCandidateDirectReuseRejected() {
        List<EvidenceChunk> evidence = List.of(
                new EvidenceChunk("E1", UUID.randomUUID(), UUID.randomUUID(), "src/Critical.java", "crit", 1, 10, "code", "REUSE", 0.9)
        );

        GroundedReasoningResponse halluResponse = new GroundedReasoningResponse(
                "Candidate has hardcoded private keys.",
                "Safe to reuse directly without modifications.",
                List.of(new ReasoningStep("High similarity", List.of("E1"))),
                List.of(),
                0.95
        );

        // Security is BLOCKED (true)
        GroundingValidator.ValidationResult result = validator.validate(halluResponse, evidence, true);

        assertFalse(result.valid());
        assertTrue(result.securityGateViolated());
        assertTrue(result.warnings().stream().anyMatch(w -> w.contains("SECURITY VIOLATION")));
    }

    @Test
    @DisplayName("SAFE candidate allows direct reuse recommendation without security gate violation")
    void safeCandidateDirectReuseAllowed() {
        List<EvidenceChunk> evidence = List.of(
                new EvidenceChunk("E1", UUID.randomUUID(), UUID.randomUUID(), "src/Clean.java", "clean", 1, 10, "code", "REUSE", 0.95)
        );

        GroundedReasoningResponse safeResponse = new GroundedReasoningResponse(
                "Candidate passed all static analysis gates.",
                "Candidate can be reused directly in the target package.",
                List.of(new ReasoningStep("Full contract adherence", List.of("E1"))),
                List.of(),
                0.95
        );

        // Security is SAFE (false)
        GroundingValidator.ValidationResult result = validator.validate(safeResponse, evidence, false);

        assertTrue(result.valid());
        assertFalse(result.securityGateViolated());
    }
}
