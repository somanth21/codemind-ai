package com.codemind.web.dto;

public record FileContentResponse(
        String relativePath,
        String content,
        long sizeBytes
) {}
