package com.codemind.web;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ReuseAnalysisSecurityTest {

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
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private RepositoryIngestionService ingestionService;

    private UserEntity userA;
    private UserEntity userB;
    private String tokenA;
    private String tokenB;

    @BeforeEach
    void setUp() {
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

        userA = userRepository.save(new UserEntity(
                UUID.randomUUID(), "usera@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));
        userB = userRepository.save(new UserEntity(
                UUID.randomUUID(), "userb@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));

        tokenA = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userA));
        tokenB = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userB));
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
    @DisplayName("End-to-End Reuse Analysis: Ingest -> Static Analysis -> Reuse Search -> Deterministic Output")
    void testEndToEndReuseAnalysisWithDeterminism() throws Exception {
        String javaSource = """
                package com.codemind.sample;
                
                public class MathUtils {
                    public static int calculateGreatestCommonDivisor(int a, int b) {
                        while (b != 0) {
                            int t = b;
                            b = a % b;
                            a = t;
                        }
                        return a;
                    }
                }
                """;

        byte[] zipBytes = createSampleZip("src/MathUtils.java", javaSource);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Math Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // 1. Run static analysis first
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        // 2. Perform Reuse Analysis for User A
        String requestBody = "{\"query\": \"calculate greatest common divisor\", \"limit\": 5}";

        String response1 = mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/reuse/analyze")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.decision", anyOf(is("REUSE_DIRECTLY"), is("REUSE_WITH_ADAPTATION"))))
                .andExpect(jsonPath("$.securityStatus", is("SAFE")))
                .andExpect(jsonPath("$.candidates", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.candidates[0].symbolName", containsString("calculateGreatestCommonDivisor")))
                .andExpect(jsonPath("$.candidates[0].evidence", hasSize(greaterThan(0))))
                .andReturn().getResponse().getContentAsString();

        // 3. Repeat exact same query and verify determinism
        String response2 = mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/reuse/analyze")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var node1 = mapper.readTree(response1);
        var node2 = mapper.readTree(response2);

        // Scores and decisions must be identical
        org.junit.jupiter.api.Assertions.assertEquals(node1.get("decision").asText(), node2.get("decision").asText());
        org.junit.jupiter.api.Assertions.assertEquals(node1.get("overallScore").asDouble(), node2.get("overallScore").asDouble(), 0.001);
        org.junit.jupiter.api.Assertions.assertEquals(node1.get("confidence").asDouble(), node2.get("confidence").asDouble(), 0.001);
    }

    @Test
    @DisplayName("Multi-Tenant RBAC: User B cannot run or view reuse analysis on User A's repository")
    void testTenantIsolationForbidden() throws Exception {
        String javaSource = "public class Hello { public void sayHello() {} }";
        byte[] zipBytes = createSampleZip("src/Hello.java", javaSource);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Hello Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // User B attempts to run reuse analysis -> 403 Forbidden
        String requestBody = "{\"query\": \"say hello\", \"limit\": 5}";
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/reuse/analyze")
                        .header("Authorization", "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isForbidden());

        // User B attempts to list reuse analyses -> 403 Forbidden
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/reuse")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Security Gate: Candidate with hardcoded secrets is BLOCKED and never recommended for direct reuse")
    void testSecurityGatingBlocksDirectReuse() throws Exception {
        String javaWithSecret = """
                package com.codemind.sample;
                
                public class TokenStorage {
                    // AKIA1234567890ABCDEF
                    public String getApiKey() {
                        return "AKIA1234567890ABCDEF";
                    }
                }
                """;

        byte[] zipBytes = createSampleZip("src/TokenStorage.java", javaWithSecret);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Security Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // Run static analysis -> will detect AWS Key
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated());

        // Run reuse analysis searching for apiKey
        String requestBody = "{\"query\": \"get api key\", \"limit\": 5}";
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/reuse/analyze")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isCreated())
                // Direct reuse MUST NOT be recommended because candidate contains hardcoded secrets
                .andExpect(jsonPath("$.decision", not(is("REUSE_DIRECTLY"))))
                .andExpect(jsonPath("$.candidates[0].securityGate", is("BLOCKED")));
    }
}
