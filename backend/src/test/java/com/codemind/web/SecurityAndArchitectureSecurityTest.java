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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityAndArchitectureSecurityTest {

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
    private SecurityAnalysisRepository securityAnalysisRepository;

    @Autowired
    private SecurityFindingRepository securityFindingRepository;

    @Autowired
    private ArchitectureAnalysisRepository architectureAnalysisRepository;

    @Autowired
    private ReuseAnalysisRepository reuseAnalysisRepository;

    @Autowired
    private ReuseCandidateRepository reuseCandidateRepository;

    @Autowired
    private ReuseEvidenceRepository reuseEvidenceRepository;

    @Autowired
    private AuditLogRepository auditLogRepository;

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
        securityFindingRepository.deleteAll();
        securityAnalysisRepository.deleteAll();
        architectureAnalysisRepository.deleteAll();
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

    private byte[] createMultiFileZip(String file1, String content1, String file2, String content2) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            ZipEntry entry1 = new ZipEntry(file1);
            zos.putNextEntry(entry1);
            zos.write(content1.getBytes());
            zos.closeEntry();

            ZipEntry entry2 = new ZipEntry(file2);
            zos.putNextEntry(entry2);
            zos.write(content2.getBytes());
            zos.closeEntry();
        }
        return baos.toByteArray();
    }

    @Test
    @DisplayName("End-to-End Security Analysis, Tenant Isolation & IDOR Protection")
    void testSecurityAnalysisAndTenantIsolation() throws Exception {
        String vulnJava = """
                package com.codemind.sample;
                import java.sql.Statement;
                public class UserDb {
                    public void query(Statement stmt, String input) throws Exception {
                        stmt.executeQuery("SELECT * FROM users WHERE name = '" + input + "'");
                    }
                }
                """;

        byte[] zipBytes = createSampleZip("src/UserDb.java", vulnJava);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Sec Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // 1. Run static analysis
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        // 2. Multi-tenant isolation: User B cannot trigger security analysis on User A's repo
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/security/analyze")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // 3. User A triggers security analysis successfully
        String secResponse = mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/security/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.highCount", greaterThanOrEqualTo(1)))
                .andReturn().getResponse().getContentAsString();

        // 4. Multi-tenant isolation: User B cannot access findings or list analyses
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/security")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // 5. User A can retrieve list and findings
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/security")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)));

        // Extract security analysis ID and verify findings endpoint
        String secId = com.jayway.jsonpath.JsonPath.read(secResponse, "$.id");
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/security/" + secId + "/findings")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.content[0].severity", is("HIGH")))
                .andExpect(jsonPath("$.content[0].ruleId", is("SEC_SQL_INJECTION")));

        // 6. Audit log verification
        boolean hasAudit = auditLogRepository.findAll().stream()
                .anyMatch(l -> "SECURITY_ANALYSIS_COMPLETED".equals(l.getEventType()));
        assertTrue(hasAudit);
    }

    @Test
    @DisplayName("End-to-End Architecture Analysis, Cycle Detection & Tenant Isolation")
    void testArchitectureAnalysisAndTenantIsolation() throws Exception {
        String serviceA = """
                package com.codemind.a;
                import com.codemind.b.ServiceB;
                public class ServiceA {
                    public void callB(ServiceB b) {
                        b.callA(this);
                    }
                }
                """;
        String serviceB = """
                package com.codemind.b;
                import com.codemind.a.ServiceA;
                public class ServiceB {
                    public void callA(ServiceA a) {
                        System.out.println("Cycle");
                    }
                }
                """;

        byte[] zipBytes = createMultiFileZip("src/ServiceA.java", serviceA, "src/ServiceB.java", serviceB);
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Arch Repo", new ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // 1. Run static analysis
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status", is("COMPLETED")));

        // 2. Tenant isolation: User B cannot trigger architecture analysis
        mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/architecture/analyze")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // 3. User A triggers architecture analysis successfully
        String archResponse = mockMvc.perform(post("/api/v1/repositories/" + repo.getId() + "/architecture/analyze")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.totalClasses", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.totalPackages", greaterThanOrEqualTo(2)))
                .andReturn().getResponse().getContentAsString();

        String archId = com.jayway.jsonpath.JsonPath.read(archResponse, "$.id");

        // 4. User B cannot view analysis or graph
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/architecture/" + archId)
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/architecture/" + archId + "/graph")
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // 5. User A can view analysis and graph
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/architecture/" + archId)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.packageMetrics", notNullValue()));

        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/architecture/" + archId + "/graph")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nodes", hasSize(greaterThanOrEqualTo(2))))
                .andExpect(jsonPath("$.edges", hasSize(greaterThanOrEqualTo(1))));
    }
}
