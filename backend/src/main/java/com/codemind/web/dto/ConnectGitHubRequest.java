package com.codemind.web.dto;

import jakarta.validation.constraints.NotBlank;

public record ConnectGitHubRequest(
        @NotBlank(message = "GitHub repository URL is required")
        String url,
        String branch
) {
}
