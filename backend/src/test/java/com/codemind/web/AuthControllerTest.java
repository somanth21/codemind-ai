package com.codemind.web;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.security.service.PasswordEncoderService;
import com.codemind.web.dto.LoginRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {

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

    private UserEntity testUser;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        testUser = new UserEntity(
                UUID.randomUUID(),
                "testdev@codemind.ai",
                passwordEncoderService.encode("StrongDevPass123!"),
                Role.ROLE_DEVELOPER
        );
        userRepository.save(testUser);
    }

    @Test
    void testLoginSuccess() throws Exception {
        LoginRequest request = new LoginRequest("testdev@codemind.ai", "StrongDevPass123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken", notNullValue()))
                .andExpect(jsonPath("$.tokenType", is("Bearer")))
                .andExpect(jsonPath("$.user.email", is("testdev@codemind.ai")))
                .andExpect(jsonPath("$.user.role", is("ROLE_DEVELOPER")));
    }

    @Test
    void testLoginFailureInvalidPassword() throws Exception {
        LoginRequest request = new LoginRequest("testdev@codemind.ai", "WrongPassword123!");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.title", is("Authentication Failed")))
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.detail", containsString("Invalid email or password")));
    }

    @Test
    void testLoginValidationFailure() throws Exception {
        LoginRequest request = new LoginRequest("not-an-email", "");

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.title", is("Validation Failed")))
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.errors.email", notNullValue()))
                .andExpect(jsonPath("$.errors.password", notNullValue()));
    }

    @Test
    void testGetCurrentUserWithValidToken() throws Exception {
        UserPrincipal principal = UserPrincipal.fromEntity(testUser);
        String token = tokenProvider.generateAccessToken(principal);

        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email", is("testdev@codemind.ai")))
                .andExpect(jsonPath("$.role", is("ROLE_DEVELOPER")));
    }

    @Test
    void testGetCurrentUserUnauthenticatedReturnsProblemDetail() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Type", containsString("problem+json")))
                .andExpect(jsonPath("$.title", is("Unauthorized")))
                .andExpect(jsonPath("$.status", is(401)));
    }
}
