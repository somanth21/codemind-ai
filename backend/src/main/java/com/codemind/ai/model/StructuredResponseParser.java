package com.codemind.ai.model;

import com.codemind.ai.exception.GroundingValidationException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Robust JSON parser for LLM structured outputs.
 * Strips markdown code blocks, tolerates extra whitespace, and validates mandatory schema fields.
 */
@Component
public class StructuredResponseParser {

    private static final Logger log = LoggerFactory.getLogger(StructuredResponseParser.class);
    private final ObjectMapper objectMapper;

    public StructuredResponseParser(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public GroundedReasoningResponse parse(String rawContent) {
        if (rawContent == null || rawContent.isBlank()) {
            throw new GroundingValidationException("LLM returned empty or null content.");
        }

        String cleaned = cleanJsonContent(rawContent);

        try {
            JsonNode root = objectMapper.readTree(cleaned);

            String summary = root.path("summary").asText("");
            String recommendation = root.path("recommendation").asText("");
            double confidence = root.path("confidence").asDouble(0.8);

            List<ReasoningStep> reasoningList = new ArrayList<>();
            JsonNode reasoningArray = root.path("reasoning");
            if (reasoningArray.isArray()) {
                for (JsonNode stepNode : reasoningArray) {
                    String claim = stepNode.path("claim").asText("");
                    List<String> evidenceIds = new ArrayList<>();
                    JsonNode evArray = stepNode.path("evidenceIds");
                    if (evArray.isArray()) {
                        for (JsonNode idNode : evArray) {
                            String id = idNode.asText().trim();
                            // Normalize [E1] or E1 -> E1
                            id = id.replaceAll("[\\[\\]]", "");
                            if (!id.isBlank()) {
                                evidenceIds.add(id);
                            }
                        }
                    }
                    reasoningList.add(new ReasoningStep(claim, evidenceIds));
                }
            }

            List<String> limitations = new ArrayList<>();
            JsonNode limitationsArray = root.path("limitations");
            if (limitationsArray.isArray()) {
                for (JsonNode limNode : limitationsArray) {
                    String text = limNode.asText("");
                    if (!text.isBlank()) {
                        limitations.add(text);
                    }
                }
            }

            if (summary.isBlank() && recommendation.isBlank()) {
                throw new GroundingValidationException("Structured reasoning output is missing both summary and recommendation.");
            }

            return new GroundedReasoningResponse(
                    summary,
                    recommendation,
                    reasoningList,
                    limitations,
                    confidence
            );

        } catch (GroundingValidationException gve) {
            throw gve;
        } catch (Exception e) {
            log.error("Failed to parse structured LLM response: {}", e.getMessage());
            log.debug("Raw unparseable content:\n{}", rawContent);
            throw new GroundingValidationException("Malformed structured reasoning JSON from LLM: " + e.getMessage(), e);
        }
    }

    public static String cleanJsonContent(String raw) {
        String trimmed = raw.trim();
        // Remove ```json and ```
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```JSON")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }

        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }

        return trimmed.trim();
    }
}
