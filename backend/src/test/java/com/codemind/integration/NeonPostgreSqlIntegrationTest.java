package com.codemind.integration;

import com.codemind.domain.model.RepositoryEntity;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.RepositoryEntityRepository;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.security.service.PasswordEncoderService;
import com.codemind.web.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Dedicated integration test verifying live PostgreSQL / Neon connectivity,
 * Flyway migration execution, authentication, and tenant isolation.
 * Runs when DATABASE_URL is present in the environment.
 */
@SpringBootTest(properties = {
        "spring.profiles.active=dev",
        "USE_ENV_DATABASE_URL=true",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect",
        "spring.jpa.properties.hibernate.default_schema=public",
        "codemind.llm.provider=MOCK"
})
@AutoConfigureMockMvc
@EnabledIfEnvironmentVariable(named = "DATABASE_URL", matches = ".+")
public class NeonPostgreSqlIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RepositoryEntityRepository repositoryEntityRepository;

    @Autowired
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Test
    @DisplayName("Verify Neon PostgreSQL connection metadata and dialect")
    void testNeonConnectionMetadata() throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            assertThat(connection.isValid(5)).isTrue();
            DatabaseMetaData metaData = connection.getMetaData();
            assertThat(metaData.getDatabaseProductName()).containsIgnoringCase("PostgreSQL");
        }
    }

    @Test
    @DisplayName("Verify authentication flow, BCrypt password verification, and JWT generation against live database")
    void testAuthenticationFlowAgainstNeon() throws Exception {
        String testEmail = "neon-test-" + UUID.randomUUID() + "@codemind.ai";
        String rawPassword = "NeonSecurePass123!";

        UserEntity user = new UserEntity(
                UUID.randomUUID(),
                testEmail,
                passwordEncoderService.encode(rawPassword),
                Role.ROLE_DEVELOPER
        );
        userRepository.save(user);

        // Test login
        LoginRequest loginRequest = new LoginRequest(testEmail, rawPassword);
        String responseBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.user.email", is(testEmail)))
                .andExpect(jsonPath("$.user.role", is("ROLE_DEVELOPER")))
                .andReturn().getResponse().getContentAsString();

        String token = objectMapper.readTree(responseBody).get("accessToken").asText();

        // Test /api/v1/auth/me with the generated JWT
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is(testEmail)))
                .andExpect(jsonPath("$.role", is("ROLE_DEVELOPER")));

        // Clean up
        userRepository.delete(user);
    }

    @Test
    @DisplayName("Verify multi-tenant repository isolation against live PostgreSQL")
    void testTenantIsolationAgainstNeon() throws Exception {
        // Create Tenant A
        String emailA = "tenant-a-" + UUID.randomUUID() + "@codemind.ai";
        UserEntity userA = new UserEntity(UUID.randomUUID(), emailA, passwordEncoderService.encode("PassA!123"), Role.ROLE_DEVELOPER);
        userRepository.save(userA);
        String tokenA = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userA));

        // Create Tenant B
        String emailB = "tenant-b-" + UUID.randomUUID() + "@codemind.ai";
        UserEntity userB = new UserEntity(UUID.randomUUID(), emailB, passwordEncoderService.encode("PassB!123"), Role.ROLE_DEVELOPER);
        userRepository.save(userB);
        String tokenB = tokenProvider.generateAccessToken(UserPrincipal.fromEntity(userB));

        // Create repository owned by Tenant A
        RepositoryEntity repoA = new RepositoryEntity(
                UUID.randomUUID(),
                "repo-tenant-a",
                "LOCAL",
                userA
        );
        repositoryEntityRepository.save(repoA);

        // Tenant A accesses own repository -> 200 OK
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId())
                        .header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(repoA.getId().toString())));

        // Tenant B attempts to access Tenant A's repository -> 403 Forbidden (tenant isolated and audited)
        mockMvc.perform(get("/api/v1/repositories/" + repoA.getId())
                        .header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isForbidden());

        // Clean up
        repositoryEntityRepository.delete(repoA);
        userRepository.delete(userA);
        userRepository.delete(userB);
    }
}
