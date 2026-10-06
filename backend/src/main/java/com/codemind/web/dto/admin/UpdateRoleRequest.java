package com.codemind.web.dto.admin;

import com.codemind.domain.model.Role;
import jakarta.validation.constraints.NotNull;

public record UpdateRoleRequest(
        @NotNull(message = "Role must not be null")
        Role role
) {}