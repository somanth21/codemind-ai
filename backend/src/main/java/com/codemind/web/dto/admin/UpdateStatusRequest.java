package com.codemind.web.dto.admin;

import jakarta.validation.constraints.NotNull;

public record UpdateStatusRequest(
        @NotNull(message = "Active status must not be null")
        Boolean active
) {}