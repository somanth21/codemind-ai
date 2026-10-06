package com.codemind.web.dto;

import com.codemind.domain.model.Role;
import com.codemind.domain.model.UserEntity;

import java.util.UUID;

public record UserDto(
        UUID id,
        String email,
        Role role,
        boolean active
) {
    public static UserDto fromEntity(UserEntity entity) {
        return new UserDto(
                entity.getId(),
                entity.getEmail(),
                entity.getRole(),
                entity.isActive()
        );
    }
}
