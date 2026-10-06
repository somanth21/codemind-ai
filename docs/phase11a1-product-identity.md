# Phase 11A.1: Product Entry, Authentication UX, Registration & Admin Console

## 1. Overview & Architectural Principles

Phase 11A.1 transforms the CodeMind AI application from a development-oriented login-first interface into a production-grade AI developer platform with:
- A public introductory landing page communicating the core message: *"Understand your codebase before you change it."*
- Polished authentication UX (password visibility toggle, clean errors, removal of seeded credentials).
- Secure public user registration (`POST /api/v1/auth/register`) defaulting strictly to `ROLE_DEVELOPER`.
- User profile management (`/profile`) and password updates (`POST /api/v1/auth/change-password`).
- A comprehensive, 7-tab Admin Console (`/admin`) guarded by `@PreAuthorize("hasRole('ADMIN')")`.

---

## 2. Security Boundaries & Invariants

| Guardrail | Enforcement Mechanism |
| :--- | :--- |
| **Registration Role Security** | `AuthenticationServiceImpl.register()` ignores client-supplied roles and strictly hardcodes `Role.ROLE_DEVELOPER`. |
| **Admin Route Isolation** | `@PreAuthorize("hasRole('ADMIN')")` at class level on `AdminController` + Spring Security Method Security. Non-admins receive `403 Forbidden`. |
| **Admin Demotion/Deactivation Safety** | Demoting or disabling an admin checks that at least one other active admin remains in the system. |
| **No Credential Exposure** | Development seeds (`developer@codemind.ai` / `DevSecure123!`) removed from public pages; BCrypt (work factor 12) adaptive hashing on all credentials. |
| **Stateless Auditing** | All registration events, password updates, admin role changes, and status alterations are permanently logged via `AuditService`. |

---

## 3. Implemented REST Endpoints

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Public registration returning JWT bearer token and user DTO with `ROLE_DEVELOPER`.
- `POST /api/v1/auth/login` — Public login returning JWT bearer token.
- `POST /api/v1/auth/change-password` — Authenticated password update with current password validation.
- `GET /api/v1/auth/me` — Authenticated user details.

### Admin Console (`/api/v1/admin/**` — Requires `ROLE_ADMIN`)
- `GET /api/v1/admin/overview` — High-level counts (users, active users, repos, analyses, findings, audit events).
- `GET /api/v1/admin/users` — Paginated user directory with search and role management.
- `PATCH /api/v1/admin/users/{id}/role` — Modify user role (`ROLE_DEVELOPER`, `ROLE_ADMIN`, `ROLE_AUDITOR`).
- `PATCH /api/v1/admin/users/{id}/status` — Enable or disable user account.
- `GET /api/v1/admin/repositories` — Cross-system repository catalog with owner details and analysis timestamps.
- `GET /api/v1/admin/security` — Aggregated security posture and category distribution.
- `GET /api/v1/admin/audit` — Paginated audit log stream with event and principal filtering.
- `GET /api/v1/admin/ai` — Grounded AI reasoning telemetry (invocations, grounding rate, token usage estimates).
- `GET /api/v1/admin/health` — Database latency, runtime memory, JVM uptime, CPU cores.

---

## 4. Verification & Test Metrics

- **Backend Tests**: 144 passing tests (including `RegistrationAndAdminSecurityTest.java`).
- **Frontend Tests**: 24 passing Vitest tests (including `Register.test.tsx`, `Login.test.tsx`, `App.test.tsx`).
- **Frontend Production Build**: Zero TypeScript errors; Vite bundle output cleanly generated in `dist/`.
- **Phase 10 Evaluation Harness**: 11/11 tests passing (`test_evaluation_harness.py`).