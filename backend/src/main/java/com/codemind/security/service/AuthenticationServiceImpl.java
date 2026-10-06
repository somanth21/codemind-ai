package com.codemind.security.service;

import com.codemind.audit.service.AuditService;
import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.jwt.JwtTokenProvider;
import com.codemind.security.model.UserPrincipal;
import com.codemind.web.dto.AuthResponse;
import com.codemind.web.dto.ChangePasswordRequest;
import com.codemind.web.dto.LoginRequest;
import com.codemind.web.dto.RegisterRequest;
import com.codemind.web.dto.UserDto;
import org.slf4j.MDC;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AuthenticationServiceImpl implements AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final AuditService auditService;
    private final UserRepository userRepository;
    private final PasswordEncoderService passwordEncoderService;

    public AuthenticationServiceImpl(
            AuthenticationManager authenticationManager,
            JwtTokenProvider tokenProvider,
            AuditService auditService,
            UserRepository userRepository,
            PasswordEncoderService passwordEncoderService
    ) {
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.passwordEncoderService = passwordEncoderService;
    }

    @Override
    public AuthResponse login(LoginRequest request, String ipAddress) {
        String correlationId = MDC.get("correlationId");
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            String accessToken = tokenProvider.generateAccessToken(principal);

            auditService.logEvent(
                    principal.getUsername(),
                    "LOGIN_SUCCESS",
                    "SUCCESS",
                    ipAddress,
                    correlationId,
                    "User authenticated successfully"
            );

            UserDto userDto = new UserDto(
                    principal.getId(),
                    principal.getUsername(),
                    principal.getRole(),
                    principal.isEnabled()
            );

            return AuthResponse.bearer(accessToken, tokenProvider.getExpirationMs(), userDto);
        } catch (AuthenticationException e) {
            auditService.logEvent(
                    request.email(),
                    "LOGIN_FAILURE",
                    "FAILURE",
                    ipAddress,
                    correlationId,
                    "Failed login attempt: " + e.getMessage()
            );
            throw new BadCredentialsException("Invalid email or password");
        }
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request, String ipAddress) {
        String correlationId = MDC.get("correlationId");
        String email = request.email().trim().toLowerCase();

        if (!request.password().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        if (userRepository.existsByEmail(email)) {
            auditService.logEvent(
                    email,
                    "REGISTRATION_FAILURE",
                    "FAILURE",
                    ipAddress,
                    correlationId,
                    "Registration attempted with existing email: " + email
            );
            throw new IllegalArgumentException("Email already registered: " + email);
        }

        // Always assign ROLE_DEVELOPER for self-service registration
        String passwordHash = passwordEncoderService.encode(request.password());
        UserEntity userEntity = new UserEntity(UUID.randomUUID(), email, passwordHash, Role.ROLE_DEVELOPER);
        userEntity.setActive(true);
        userEntity = userRepository.save(userEntity);

        auditService.logEvent(
                email,
                "REGISTRATION_SUCCESS",
                "SUCCESS",
                ipAddress,
                correlationId,
                "New user registered with role ROLE_DEVELOPER"
        );

        UserPrincipal principal = new UserPrincipal(
                userEntity.getId(),
                userEntity.getEmail(),
                userEntity.getPasswordHash(),
                userEntity.getRole(),
                userEntity.isActive()
        );

        String accessToken = tokenProvider.generateAccessToken(principal);
        UserDto userDto = new UserDto(
                userEntity.getId(),
                userEntity.getEmail(),
                userEntity.getRole(),
                userEntity.isActive()
        );

        return AuthResponse.bearer(accessToken, tokenProvider.getExpirationMs(), userDto);
    }

    @Override
    @Transactional
    public void changePassword(String email, ChangePasswordRequest request, String ipAddress) {
        String correlationId = MDC.get("correlationId");
        UserEntity user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        if (!passwordEncoderService.matches(request.currentPassword(), user.getPasswordHash())) {
            auditService.logEvent(
                    email,
                    "PASSWORD_CHANGE_FAILURE",
                    "FAILURE",
                    ipAddress,
                    correlationId,
                    "Invalid current password provided"
            );
            throw new BadCredentialsException("Current password is incorrect");
        }

        if (!request.newPassword().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("New passwords do not match");
        }

        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException("New password cannot be identical to the current password");
        }

        user.setPasswordHash(passwordEncoderService.encode(request.newPassword()));
        userRepository.save(user);

        auditService.logEvent(
                email,
                "PASSWORD_CHANGE_SUCCESS",
                "SUCCESS",
                ipAddress,
                correlationId,
                "User changed password successfully"
        );
    }

    @Override
    public UserDto getCurrentUser(UserPrincipal principal) {
        return new UserDto(
                principal.getId(),
                principal.getUsername(),
                principal.getRole(),
                principal.isEnabled()
        );
    }
}