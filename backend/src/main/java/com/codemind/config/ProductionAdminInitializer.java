package com.codemind.config;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.service.PasswordEncoderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Production Admin Initializer.
 * Seeds initial administrator account if configured via environment variables
 * (CODEMIND_ADMIN_EMAIL and CODEMIND_ADMIN_PASSWORD) and not already present.
 */
@Component
public class ProductionAdminInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductionAdminInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoderService passwordEncoderService;

    @Value("${CODEMIND_ADMIN_EMAIL:${ADMIN_EMAIL:}}")
    private String adminEmail;

    @Value("${CODEMIND_ADMIN_PASSWORD:${ADMIN_PASSWORD:}}")
    private String adminPassword;

    public ProductionAdminInitializer(UserRepository userRepository, PasswordEncoderService passwordEncoderService) {
        this.userRepository = userRepository;
        this.passwordEncoderService = passwordEncoderService;
    }

    @Override
    public void run(String... args) {
        if (adminEmail != null && !adminEmail.isBlank() && adminPassword != null && !adminPassword.isBlank()) {
            String trimmedEmail = adminEmail.trim().toLowerCase();
            if (!userRepository.existsByEmail(trimmedEmail)) {
                UserEntity admin = new UserEntity(
                        UUID.randomUUID(),
                        trimmedEmail,
                        passwordEncoderService.encode(adminPassword.trim()),
                        Role.ROLE_ADMIN
                );
                userRepository.save(admin);
                log.info("Initialized administrator account from environment: {}", trimmedEmail);
            } else {
                log.info("Administrator account already exists: {}", trimmedEmail);
            }
        }
    }
}
