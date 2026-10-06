package com.codemind.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @NotBlank(message = "Current password must not be blank")
        String currentPassword,

        @NotBlank(message = "New password must not be blank")
        @Size(min = 8, max = 100, message = "Password must be between 8 and 100 characters")
        String newPassword,

        @NotBlank(message = "Confirm new password must not be blank")
        String confirmPassword
) {}