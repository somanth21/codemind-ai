package com.codemind.web.dto.admin;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;
import java.time.Instant;
import java.util.UUID;

public record UserAdminDto(
        UUID id,
        String email,
        Role role,
        boolean active,
        Instant createdAt,
        Instant updatedAt,
        long repositoryCount
) {
    public static UserAdminDto fromEntity(UserEntity user, long repositoryCount) {
        return new UserAdminDto(
                user.getId(),
                user.getEmail(),
                user.getRole(),
                user.isActive(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                repositoryCount
        );
    }
}