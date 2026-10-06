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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
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
class AnalysisPipelineSecurityTest {

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
    private QualityFindingRepository qualityFindingRepository;

    @Autowired
    private SecretFindingRepository secretFindingRepository;

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
        secretFindingRepository.deleteAll();
        qualityFindingRepository.deleteAll();
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
    void testEndToEndStaticAnalysisPipeline() throws Exception {
        String javaSource = """
                package com.codemind.sample;
                
                import java.io.Serializable;
                
                public class Calculator implements Serializable {
                    private int base = 10;
                    // TODO: implement subtraction
                    
                    public int compute(int a, int b) {
                        // AWS_KEY=AKIA1234567890ABCDEF
                        if (a > 0 && b > 0) {
                            return a + b + base;
                        } else {
                            try {
                                return a / b;
                            } catch (ArithmeticException e) {
                            }
                        }
                        return 0;
                    }
                }
                """;

        byte[] zipBytes = createSampleZip("src/Calculator.java", javaSource);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Calculator Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // 1. Trigger static analysis
        String responseStr = mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.filesAnalyzed", is(1)))
                .andExpect(jsonPath("$.totalLoc", greaterThan(0)))
                .andExpect(jsonPath("$.totalClasses", is(1)))
                .andExpect(jsonPath("$.totalMethods", is(1)))
                .andExpect(jsonPath("$.averageComplexity", greaterThan(1.0)))
                .andExpect(jsonPath("$.maintainabilityIndex", greaterThan(0.0)))
                .andReturn().getResponse().getContentAsString();

        // Extract analysisId
        com.fasterxml.jackson.databind.JsonNode rootNode = new com.fasterxml.jackson.databind.ObjectMapper().readTree(responseStr);
        String analysisId = rootNode.get("id").asText();

        // 2. Query Symbols endpoint
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/analyses/" + analysisId + "/symbols")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[?(@.name == 'Calculator')].kind", contains("CLASS")))
                .andExpect(jsonPath("$.content[?(@.name == 'compute')].kind", contains("METHOD")));

        // 3. Query Relationships endpoint
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/analyses/" + analysisId + "/relationships")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[?(@.relationshipType == 'IMPLEMENTS')]", not(empty())));

        // 4. Query Metrics endpoint
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/analyses/" + analysisId + "/metrics")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].loc", greaterThan(0)))
                .andExpect(jsonPath("$.content[0].cyclomaticComplexity", greaterThan(1)));

        // 5. Query Findings endpoint
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/analyses/" + analysisId + "/findings")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", not(empty())))
                .andExpect(jsonPath("$.content[?(@.ruleId == 'EMPTY_CATCH_BLOCK')]", not(empty())))
                .andExpect(jsonPath("$.content[?(@.ruleId == 'TODO_FIXME_MARKER')]", not(empty())));

        // 6. Query Secrets endpoint (Verify Strict Redaction)
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/analyses/" + analysisId + "/secrets")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].ruleId", is("AWS_ACCESS_KEY")))
                .andExpect(jsonPath("$.content[0].redactedEvidence", not(containsString("AKIA1234567890ABCDEF"))))
                .andExpect(jsonPath("$.content[0].redactedEvidence", containsString("****")));
    }

    @Test
    void testFailureIsolationOnMalformedJavaFile() throws Exception {
        String brokenJava = """
                package com.broken;
                public class Incomplete {
                    void brokenMethod( {
                """;

        byte[] zipBytes = createSampleZip("Incomplete.java", brokenJava);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Broken Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // Static analysis must NOT crash; must isolate error and complete
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.errorCount", is(1)))
                .andExpect(jsonPath("$.filesAnalyzed", is(1)));
    }

    @Test
    void testMultiTenantAuthorizationOnAnalysis() throws Exception {
        byte[] zipBytes = createSampleZip("Main.java", "public class Main {}");
        RepositoryEntity repoA = ingestionService.registerAndIngest(
                "User A Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // User B cannot trigger analysis on User A's repository
        mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // Trigger analysis as User A
        String resp = mockMvc.perform(post("/api/v1/repositories/" + repoA.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String analysisId = new com.fasterxml.jackson.databind.ObjectMapper().readTree(resp).get("id").asText();

        // User B cannot read User A's analysis runs
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId() + "/analyses")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // User B cannot read User A's analysis details
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId() + "/analyses/" + analysisId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());
    }
}
