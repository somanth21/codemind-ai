package com.codemind.web;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.security.service.PasswordEncoderService;
import com.codemind.web.dto.ChangePasswordRequest;
import com.codemind.web.dto.RegisterRequest;
import com.codemind.web.dto.admin.UpdateRoleRequest;
import com.codemind.web.dto.admin.UpdateStatusRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class RegistrationAndAdminSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoderService passwordEncoderService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    private UserEntity adminUser;
    private UserEntity devUser;
    private String adminToken;
    private String devToken;

    @BeforeEach
    void setUp() {
        adminUser = userRepository.findByEmail("admin-test@codemind.ai")
                .orElseGet(() -> userRepository.save(new UserEntity(
                        UUID.randomUUID(),
                        "admin-test@codemind.ai",
                        passwordEncoderService.encode("AdminPass123!"),
                        Role.ROLE_ADMIN
                )));

        devUser = userRepository.findByEmail("dev-test@codemind.ai")
                .orElseGet(() -> userRepository.save(new UserEntity(
                        UUID.randomUUID(),
                        "dev-test@codemind.ai",
                        passwordEncoderService.encode("DevPass123!"),
                        Role.ROLE_DEVELOPER
                )));

        UserPrincipal adminPrincipal = new UserPrincipal(
                adminUser.getId(), adminUser.getEmail(), adminUser.getPasswordHash(), adminUser.getRole(), adminUser.isActive()
        );
        adminToken = tokenProvider.generateAccessToken(adminPrincipal);

        UserPrincipal devPrincipal = new UserPrincipal(
                devUser.getId(), devUser.getEmail(), devUser.getPasswordHash(), devUser.getRole(), devUser.isActive()
        );
        devToken = tokenProvider.generateAccessToken(devPrincipal);
    }

    @Test
    @DisplayName("Public Registration: successfully creates developer user")
    void testPublicRegistration_Success() throws Exception {
        String testEmail = "new-developer@codemind.ai";
        RegisterRequest req = new RegisterRequest("New Dev", testEmail, "SecurePassword123!", "SecurePassword123!");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.user.email", is(testEmail)))
                .andExpect(jsonPath("$.user.role", is("ROLE_DEVELOPER")));

        UserEntity created = userRepository.findByEmail(testEmail).orElseThrow();
        assertEquals(Role.ROLE_DEVELOPER, created.getRole());
        assertTrue(created.isActive());
        assertTrue(passwordEncoderService.matches("SecurePassword123!", created.getPasswordHash()));
    }

    @Test
    @DisplayName("Public Registration: rejects duplicate email")
    void testPublicRegistration_DuplicateEmail() throws Exception {
        RegisterRequest req = new RegisterRequest("Dev Clone", adminUser.getEmail(), "SecurePassword123!", "SecurePassword123!");

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("Change Password: valid request succeeds")
    void testChangePassword_Success() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest("DevPass123!", "NewDevPass123!", "NewDevPass123!");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message", containsString("successfully")));

        UserEntity updated = userRepository.findByEmail(devUser.getEmail()).orElseThrow();
        assertTrue(passwordEncoderService.matches("NewDevPass123!", updated.getPasswordHash()));
    }

    @Test
    @DisplayName("Change Password: invalid current password fails")
    void testChangePassword_InvalidCurrentPassword() throws Exception {
        ChangePasswordRequest req = new ChangePasswordRequest("WrongPass123!", "NewDevPass123!", "NewDevPass123!");

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .header("Authorization", "Bearer " + devToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin Console: ROLE_ADMIN can access overview")
    void testAdminOverview_AdminAccess() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers", greaterThanOrEqualTo(2)))
                .andExpect(jsonPath("$.activeUsers", greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("Admin Console: ROLE_DEVELOPER is forbidden from admin endpoints")
    void testAdminOverview_DeveloperForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview")
                        .header("Authorization", "Bearer " + devToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin Console: anonymous user is unauthorized")
    void testAdminOverview_AnonymousUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/admin/overview"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Admin Console: ROLE_ADMIN can update user role")
    void testAdminUpdateRole_Success() throws Exception {
        UpdateRoleRequest req = new UpdateRoleRequest(Role.ROLE_AUDITOR);

        mockMvc.perform(patch("/api/v1/admin/users/" + devUser.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role", is("ROLE_AUDITOR")));

        UserEntity updated = userRepository.findById(devUser.getId()).orElseThrow();
        assertEquals(Role.ROLE_AUDITOR, updated.getRole());
    }

    @Test
    @DisplayName("Admin Console: ROLE_ADMIN can toggle user status")
    void testAdminUpdateStatus_Success() throws Exception {
        UpdateStatusRequest req = new UpdateStatusRequest(false);

        mockMvc.perform(patch("/api/v1/admin/users/" + devUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(false)));

        UserEntity updated = userRepository.findById(devUser.getId()).orElseThrow();
        assertFalse(updated.isActive());
    }
}