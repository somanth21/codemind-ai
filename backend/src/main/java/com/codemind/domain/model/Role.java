package com.codemind.domain.model;

/**
 * Foundational RBAC Roles for CodeMind AI.
 * Strictly limited to core boundaries in Phase 1.
 */
public enum Role {
    ROLE_ADMIN,
    ROLE_DEVELOPER,
    ROLE_AUDITOR;

    public String getAuthority() {
        return name();
    }
}
