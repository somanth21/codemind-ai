package com.codemind.ai;

import com.codemind.ai.exception.GroundingValidationException;
import com.codemind.ai.model.GroundedReasoningResponse;
import com.codemind.ai.model.StructuredResponseParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class StructuredResponseParserTest {

    private final StructuredResponseParser parser = new StructuredResponseParser(new ObjectMapper());

    @Test
    @DisplayName("Parses clean JSON into strongly-typed GroundedReasoningResponse")
    void parseCleanJson() {
        String json = """
                {
                  "summary": "Existing UserService provides findUser method.",
                  "recommendation": "Candidate can be adapted by wrapping into order controller.",
                  "reasoning": [
                    {
                      "claim": "UserService is tested and maintainable.",
                      "evidenceIds": ["E1", "E2"]
                    }
                  ],
                  "limitations": [
                    "Requires additional null check."
                  ],
                  "confidence": 0.91
                }
                """;

        GroundedReasoningResponse res = parser.parse(json);
        assertEquals("Existing UserService provides findUser method.", res.summary());
        assertEquals("Candidate can be adapted by wrapping into order controller.", res.recommendation());
        assertEquals(1, res.reasoning().size());
        assertEquals("UserService is tested and maintainable.", res.reasoning().get(0).claim());
        assertEquals(2, res.reasoning().get(0).evidenceIds().size());
        assertEquals("E1", res.reasoning().get(0).evidenceIds().get(0));
        assertEquals("E2", res.reasoning().get(0).evidenceIds().get(1));
        assertEquals(1, res.limitations().size());
        assertEquals(0.91, res.confidence());
    }

    @Test
    @DisplayName("Strips markdown code fences (```json ... ```) gracefully")
    void stripsMarkdownCodeFences() {
        String markdown = """
                ```json
                {
                  "summary": "Found matching repository symbol.",
                  "recommendation": "Reuse directly.",
                  "reasoning": [
                    {
                      "claim": "Direct method match.",
                      "evidenceIds": ["E1"]
                    }
                  ],
                  "limitations": [],
                  "confidence": 0.88
                }
                ```
                """;

        GroundedReasoningResponse res = parser.parse(markdown);
        assertEquals("Found matching repository symbol.", res.summary());
        assertEquals("Reuse directly.", res.recommendation());
        assertEquals(1, res.reasoning().size());
    }

    @Test
    @DisplayName("Normalizes bracketed evidence IDs like [E1] to E1")
    void normalizesBracketedEvidenceIds() {
        String json = """
                {
                  "summary": "Summary text",
                  "recommendation": "Rec text",
                  "reasoning": [
                    {
                      "claim": "Observation",
                      "evidenceIds": ["[E1]", "[E2]"]
                    }
                  ],
                  "limitations": [],
                  "confidence": 0.85
                }
                """;

        GroundedReasoningResponse res = parser.parse(json);
        assertEquals("E1", res.reasoning().get(0).evidenceIds().get(0));
        assertEquals("E2", res.reasoning().get(0).evidenceIds().get(1));
    }

    @Test
    @DisplayName("Throws GroundingValidationException on malformed JSON")
    void throwsOnMalformedJson() {
        String malformed = "{ this is not valid json";
        assertThrows(GroundingValidationException.class, () -> parser.parse(malformed));
    }

    @Test
    @DisplayName("Throws GroundingValidationException on blank or null content")
    void throwsOnBlankContent() {
        assertThrows(GroundingValidationException.class, () -> parser.parse(""));
        assertThrows(GroundingValidationException.class, () -> parser.parse(null));
    }
}
