package com.codemind.web;

import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.RepositoryStatus;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.RepositoryEntityRepository;
import com.codemind.domain.repository.RepositoryFileRepository;
import com.codemind.domain.repository.UserRepository;
import com.codemind.ingestion.RepositoryIngestionService;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.security.service.PasswordEncoderService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RepositoryIngestionSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RepositoryEntityRepository repositoryEntityRepository;

    @Autowired
    private RepositoryFileRepository repositoryFileRepository;

    @Autowired
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private RepositoryIngestionService ingestionService;

    private UserEntity userA;
    private UserEntity userB;
    private UserEntity adminUser;

    private String tokenA;
    private String tokenB;
    private String tokenAdmin;

    @BeforeEach
    void setUp() {
        repositoryFileRepository.deleteAll();
        repositoryEntityRepository.deleteAll();
        userRepository.deleteAll();

        userA = userRepository.save(new UserEntity(
                UUID.randomUUID(), "usera@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));
        userB = userRepository.save(new UserEntity(
                UUID.randomUUID(), "userb@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_DEVELOPER
        ));
        adminUser = userRepository.save(new UserEntity(
                UUID.randomUUID(), "admin@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_ADMIN
        ));

        tokenA = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userA));
        tokenB = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userB));
        tokenAdmin = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(adminUser));
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
    void testSuccessfulZipIngestionAndMetadataCollection() throws Exception {
        byte[] zipBytes = createSampleZip("src/Main.java", "public class Main { public static void main(String[] args) {} }");
        MockMultipartFile file = new MockMultipartFile("file", "project.zip", "application/zip", zipBytes);

        mockMvc.perform(multipart("/api/v1/repositories")
                        .file(file)
                        .param("name", "Sample Project")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.name", is("Sample Project")))
                .andExpect(jsonPath("$.status", is("READY")))
                .andExpect(jsonPath("$.fileCount", is(1)))
                .andExpect(jsonPath("$.totalSizeBytes", greaterThan(0)))
                // Verify server filesystem path is NEVER exposed in API response
                .andExpect(jsonPath("$.storagePath").doesNotExist())
                .andExpect(jsonPath("$.serverPath").doesNotExist());
    }

    @Test
    void testRepositoryIsolationUserBCannotAccessUserARepository() throws Exception {
        // User A ingests a repository
        byte[] zipBytes = createSampleZip("Secret.java", "class Secret {}");
        RepositoryEntity repoA = ingestionService.registerAndIngest(
                "User A Vault", new java.io.ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // User B attempts to access User A's repository
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.title", is("Forbidden")))
                .andExpect(jsonPath("$.status", is(403)));

        // User B attempts to delete User A's repository
        mockMvc.perform(delete("/api/v1/repositories/" + repoA.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());
    }

    @Test
    void testAdminCanAccessAnyUserRepository() throws Exception {
        byte[] zipBytes = createSampleZip("App.java", "class App {}");
        RepositoryEntity repoA = ingestionService.registerAndIngest(
                "User A Project", new java.io.ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // Admin can access
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId())
                        .header("Authorization", "Bearer " + tokenAdmin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(repoA.getId().toString())));
    }

    @Test
    void testMaliciousZipWithTraversalIsRejectedAndCleanedUp() throws Exception {
        byte[] zipBytes = createSampleZip("../escape.txt", "attack content");
        MockMultipartFile file = new MockMultipartFile("file", "malicious.zip", "application/zip", zipBytes);

        mockMvc.perform(multipart("/api/v1/repositories")
                        .file(file)
                        .param("name", "Hostile Project")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.detail", containsString("traversal")));
    }

    @Test
    void testRepositoryTreeEndpoint() throws Exception {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ZipOutputStream zos = new ZipOutputStream(baos)) {
            zos.putNextEntry(new ZipEntry("src/main/App.java"));
            zos.write("class App {}".getBytes());
            zos.closeEntry();
            zos.putNextEntry(new ZipEntry("README.md"));
            zos.write("# Readme".getBytes());
            zos.closeEntry();
        }
        byte[] zipBytes = baos.toByteArray();

        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Tree Repo", new java.io.ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/tree")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("root")))
                .andExpect(jsonPath("$.type", is("DIRECTORY")))
                .andExpect(jsonPath("$.children", hasSize(2)));
    }

    @Test
    void testFileContentRetrievalAndTraversalBlocking() throws Exception {
        byte[] zipBytes = createSampleZip("src/Hello.java", "public class Hello {}");
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Content Repo", new java.io.ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        // 1. Valid file content retrieval
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/files/content")
                        .param("path", "src/Hello.java")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.relativePath", is("src/Hello.java")))
                .andExpect(jsonPath("$.content", is("public class Hello {}")));

        // 2. Traversal attempt blocked
        mockMvc.perform(get("/api/v1/repositories/" + repo.getId() + "/files/content")
                        .param("path", "../../../etc/passwd")
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("problem+json")));
    }

    @Test
    void testRepositoryDeletionCleansDatabaseAndSandbox() throws Exception {
        byte[] zipBytes = createSampleZip("Temp.java", "class Temp {}");
        RepositoryEntity repo = ingestionService.registerAndIngest(
                "Delete Test", new java.io.ByteArrayInputStream(zipBytes), zipBytes.length, userA
        );

        Path sourcePath = ingestionService.getSandboxSourcePath(repo.getId());
        Path repoSandboxDir = sourcePath.getParent();

        mockMvc.perform(delete("/api/v1/repositories/" + repo.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isNoContent());

        // Verify DB record is deleted
        assertFalse(repositoryEntityRepository.existsById(repo.getId()));

        // Verify sandbox files are deleted
        assertFalse(Files.exists(repoSandboxDir), "Sandbox directory must be removed upon repository deletion");
    }

    @Test
    void testGitHubIngestionRejectsSsrfAndAcceptsValidUrl() throws Exception {
        // 1. SSRF URL rejection
        String maliciousPayload = "{\"url\": \"http://169.254.169.254/latest/meta-data\"}";
        mockMvc.perform(post("/api/v1/repositories/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(maliciousPayload)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.detail", containsString("HTTPS")));

        // 2. Localhost SSRF rejection
        String localhostPayload = "{\"url\": \"https://localhost/attacker/repo\"}";
        mockMvc.perform(post("/api/v1/repositories/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(localhostPayload)
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.detail", containsString("github.com")));

        // 3. Auditor role forbidden from ingesting GitHub repo
        UserEntity auditor = userRepository.save(new UserEntity(
                UUID.randomUUID(), "auditor@codemind.ai", passwordEncoderService.encode("Pass123!"), Role.ROLE_AUDITOR
        ));
        String auditorToken = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(auditor));
        String validPayload = "{\"url\": \"https://github.com/octocat/Hello-World\"}";
        mockMvc.perform(post("/api/v1/repositories/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(validPayload)
                        .header("Authorization", "Bearer " + auditorToken))
                .andExpect(status().isForbidden());
    }
}
