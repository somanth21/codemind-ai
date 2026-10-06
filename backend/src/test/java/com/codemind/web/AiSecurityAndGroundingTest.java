package com.codemind.web;

import com.codemind.ai.MockLlmClient;
import com.codemind.ai.config.LlmProperties;
import com.codemind.ai.config.LlmRateLimiter;
import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.*;
import com.codemind.ingestion.RepositoryIngestionService;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.security.service.PasswordEncoderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AiSecurityAndGroundingTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RepositoryEntityRepository repositoryEntityRepository;

    @Autowired
    private RepositoryFileRepository repositoryFileRepository;

    @Autowired
    private AnalysisRunRepository analysisRunRepository;

    @Autowired
    private SymbolRepository symbolRepository;

    @Autowired
    private RelationshipRepository relationshipRepository;

    @Autowired
    private FileMetricsRepository fileMetricsRepository;

    @Autowired
    private SymbolMetricsRepository symbolMetricsRepository;

    @Autowired
    private QualityFindingRepository qualityFindingRepository;

    @Autowired
    private SecretFindingRepository secretFindingRepository;

    @Autowired
    private ReuseAnalysisRepository reuseAnalysisRepository;

    @Autowired
    private ReuseCandidateRepository reuseCandidateRepository;

    @Autowired
    private ReuseEvidenceRepository reuseEvidenceRepository;

    @Autowired
    private AiReasoningRequestRepository aiReasoningRequestRepository;

    @Autowired
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private RepositoryIngestionService ingestionService;

    @Autowired
    private MockLlmClient mockLlmClient;

    @Autowired
    private LlmRateLimiter rateLimiter;

    @Autowired
    private LlmProperties llmProperties;

    private UserEntity userA;
    private UserEntity userB;
    private String tokenA;
    private String tokenB;
    private RepositoryEntity repoA;

    @BeforeEach
    void setUp() throws Exception {
        aiReasoningRequestRepository.deleteAll();
        reuseEvidenceRepository.deleteAll();
        reuseCandidateRepository.deleteAll();
        reuseAnalysisRepository.deleteAll();
        secretFindingRepository.deleteAll();
        qualityFindingRepository.deleteAll();
        symbolMetricsRepository.deleteAll();
        fileMetricsRepository.deleteAll();
        relationshipRepository.deleteAll();
        symbolRepository.deleteAll();
        analysisRunRepository.deleteAll();
        repositoryFileRepository.deleteAll();
        repositoryEntityRepository.deleteAll();
        userRepository.deleteAll();

        rateLimiter.reset();
        mockLlmClient.reset();

        userA = userRepository.save(new UserEntity(
                UUID.randomUUID(), "alice@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));
        userB = userRepository.save(new UserEntity(
                UUID.randomUUID(), "bob@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));

        tokenA = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userA));
        tokenB = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userB));

        // Create sample repository for User A
        String javaCode = """
                package com.codemind.demo;

                public class OrderCalculator {
                    public static double calculateTax(double amount, double rate) {
                        if (amount < 0 || rate < 0) {
                            return 0.0;
                        }
                        return amount * rate;
                    }
                }
                """;

        byte[] zipBytes = createSampleZip("src/OrderCalculator.java", javaCode);
        repoA = ingestionService.registerAndIngest(
                "Order System", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // Run deterministic static analysis
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated());

        // Run deterministic reuse analysis
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/reuse/analyze")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\": \"calculate tax\", \"limit\": 5}"))
                .andExpect(status().isCreated());
    }

    private byte[] createSampleZip(String filename, String content) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            ZipEntry entry = new ZipEntry(filename);
            zos.putNextEntry(entry);
            zos.write(content.getBytes());
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("End-to-End Grounded AI Explanation: returns cited reasoning and saves audit entity")
    void explainReuseSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"developerQuestion\": \"Can I use calculateTax in my billing service?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.provider", is("MOCK")))
                .andExpect(jsonPath("$.summary", notNullValue()))
                .andExpect(jsonPath("$.recommendation", notNullValue()))
                .andExpect(jsonPath("$.reasoning", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.reasoning[0].evidenceIds", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.evidence", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.grounded", is(true)))
                .andExpect(jsonPath("$.securityGatePreserved", is(true)))
                .andExpect(jsonPath("$.citationCoverage", greaterThan(0.0)));

        // Verify request was recorded in database history
        assertEquals(1, aiReasoningRequestRepository.count());
    }

    @Test
    @DisplayName("Tenant Isolation: User B receives 403 Forbidden attempting to access User A's repository AI reasoning")
    void tenantIsolationForbidden() throws Exception {
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"developerQuestion\": \"Intruder question\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.title", is("Forbidden")));

        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId() + "/ai/history")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Rate Limiting: Exceeding rate limit per minute returns RFC 7807 429 Too Many Requests")
    void rateLimitingEnforced() throws Exception {
        int maxAllowed = llmProperties.getRateLimitPerUserPerMinute();

        // Exhaust the allowed user quota
        for (int i = 0; i < maxAllowed; i++) {
            mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                            .header("Authorization", "Bearer " + tokenA)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isOk());
        }

        // The next request must be blocked with 429
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.title", is("Rate Limit Exceeded")))
                .andExpect(jsonPath("$.type", is("https://codemind.ai/errors/rate-limit-exceeded")));
    }

    @Test
    @DisplayName("Graceful Degradation: When LLM provider is unavailable, returns controlled 503")
    void providerUnavailableReturns503() throws Exception {
        mockLlmClient.setSimulateUnavailable(true);

        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.title", is("LLM Provider Unavailable")))
                .andExpect(jsonPath("$.type", is("https://codemind.ai/errors/llm-unavailable")));
    }

    @Test
    @DisplayName("Explain Evidence endpoint: Explores repository symbols and returns grounded summary")
    void explainEvidenceSuccess() throws Exception {
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-evidence")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"query\": \"OrderCalculator\", \"limit\": 3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.requestType", is("EXPLAIN_EVIDENCE")))
                .andExpect(jsonPath("$.grounded", is(true)));
    }

    @Test
    @DisplayName("History and request retrieval: Retrieves past AI requests by repository and ID")
    void historyAndByIdRetrieval() throws Exception {
        String respJson = mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/ai/explain-reuse")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        // Query history
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId() + "/ai/history")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));
    }
}
