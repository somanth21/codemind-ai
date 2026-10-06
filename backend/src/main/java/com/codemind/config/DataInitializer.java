package com.codemind.config;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import com.codemind.domain.repository.UserRepository;
import com.codemind.security.service.PasswordEncoderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Development Data Initializer.
 * Seeds initial foundational accounts if absent.
 */
@Component
@Profile("!prod")
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final PasswordEncoderService passwordEncoderService;

    public DataInitializer(UserRepository userRepository, PasswordEncoderService passwordEncoderService) {
        this.userRepository = userRepository;
        this.passwordEncoderService = passwordEncoderService;
    }

    @Override
    public void run(String... args) {
        if (!userRepository.existsByEmail("developer@codemind.ai")) {
            UserEntity dev = new UserEntity(
                    UUID.randomUUID(),
                    "developer@codemind.ai",
                    passwordEncoderService.encode("DevSecure123!"),
                    Role.ROLE_DEVELOPER
            );
            userRepository.save(dev);
            log.info("Initialized default developer account: developer@codemind.ai");
        }

        if (!userRepository.existsByEmail("admin@codemind.ai")) {
            UserEntity admin = new UserEntity(
                    UUID.randomUUID(),
                    "admin@codemind.ai",
                    passwordEncoderService.encode("AdminSecure123!"),
                    Role.ROLE_ADMIN
            );
            userRepository.save(admin);
            log.info("Initialized default admin account: admin@codemind.ai");
        }
    }
}
