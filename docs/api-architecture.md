# CodeMind AI — REST API Architecture

This document provides the definitive architectural specification for the CodeMind AI REST API. All documented endpoints are implemented in the Spring Boot modular monolith, protected by Spring Security 6, and verified by automated integration test suites.

---

## 1. Global API Standards

- **Base URI Prefix**: `/api/v1`
- **Content Type**: `application/json` (except multipart upload on `/api/v1/repositories`)
- **Error Format**: RFC 7807 `ProblemDetail` (`application/problem+json`) with timestamp, status, error, path, and MDC `correlationId`.
- **Authentication**: Stateless HTTP Authorization header with JWT Bearer token: `Authorization: Bearer <token>`.
- **RBAC Roles**:
  - `ROLE_ADMIN`: Full administrative privileges across all repositories and users.
  - `ROLE_DEVELOPER`: Standard developer role; can upload repositories, run analyses, and request AI reasoning on owned repositories.
  - `ROLE_AUDITOR`: Read-only compliance auditor role; can view repositories, inspect security findings, architecture graphs, and audit logs.
- **Multi-Tenant Scoping**: All repository sub-resources enforce ownership checking (`repo.owner.id == principal.id`) or elevated `ROLE_ADMIN`/`ROLE_AUDITOR` permissions.

---

## 2. Authentication & Health Endpoints

### `GET /api/v1/health`
- **Purpose**: System liveness check and diagnostic correlation ID verification.
- **Auth Required**: No (Public).
- **Response**: `200 OK` — `{"status": "UP", "timestamp": "...", "correlationId": "..."}`.

### `POST /api/v1/auth/login`
- **Purpose**: Authenticates user credentials and issues an HMAC-SHA256 signed JWT token.
- **Auth Required**: No (Public).
- **Request Body**: `LoginRequest` (`email`, `password`).
- **Response**: `200 OK` — `AuthResponse` (`token`, `type: "Bearer"`, `userId`, `email`, `fullName`, `role`).
- **Security Controls**: Password comparison via `BCryptPasswordEncoder(12)`; audit logs `LOGIN_SUCCESS` or `LOGIN_FAILURE`.

### `GET /api/v1/auth/me`
- **Purpose**: Returns the current authenticated principal's profile.
- **Auth Required**: Yes (`ADMIN`, `DEVELOPER`, `AUDITOR`).
- **Response**: `200 OK` — User profile metadata.

---

## 3. Repository Management Endpoints

### `POST /api/v1/repositories`
- **Purpose**: Uploads and securely unpacks a ZIP archive into an isolated filesystem sandbox.
- **Auth Required**: Yes (`DEVELOPER`, `ADMIN`).
- **Request**: Multipart form data with `file` (ZIP) and `name` (string).
- **Security Controls**:
  - Multipart ceiling: 100MB.
  - `PathTraversalGuard` verifies all entry paths against traversal, drive prefixes, and symlinks.
  - `ZipExtractionService` enforces extraction quotas (500MB max uncompressed, 20,000 files).
  - Atomic cleanup deletes extracted files on any failure.
- **Response**: `201 Created` — `RepositoryResponse`.

### `GET /api/v1/repositories`
- **Purpose**: Lists repositories accessible to the requesting principal.
- **Auth Required**: Yes.
- **Response**: `200 OK` — Paginated list of repositories owned by principal (or all for `ADMIN`).

### `GET /api/v1/repositories/{id}`
- **Purpose**: Retrieves repository metadata summary (file count, total size, status).
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `RepositoryResponse`.

### `DELETE /api/v1/repositories/{id}`
- **Purpose**: Permanently deletes a repository, its database metadata, and its filesystem sandbox.
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Response**: `204 No Content`.

### `GET /api/v1/repositories/{id}/tree`
- **Purpose**: Returns hierarchical file tree structure for explorer rendering.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — Tree structure with directory and file nodes.

### `GET /api/v1/repositories/{id}/files`
- **Purpose**: Returns paginated, filterable file metadata.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `page`, `size`, `language`, `isBinary`.
- **Response**: `200 OK` — `PageResponse<RepositoryFileResponse>`.

### `GET /api/v1/repositories/{id}/files/content`
- **Purpose**: Returns read-only plain text content for a sandboxed file.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `path` (relative file path).
- **Security Controls**: Path traversal verification; binary files blocked from text rendering.
- **Response**: `200 OK` — `{"filePath": "...", "content": "..."}`.

---

## 4. Deterministic Static Analysis Endpoints

### `POST /api/v1/repositories/{id}/analyze`
- **Purpose**: Triggers deterministic static analysis (JavaParser AST, metrics, quality rules, secret scanner).
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Response**: `200 OK` — `AnalysisRunResponse` (`id`, `status: "COMPLETED"`, `totalLoc`, `totalClasses`, `totalMethods`, `averageComplexity`, `maintainabilityIndex`).

### `GET /api/v1/repositories/{id}/analyses`
- **Purpose**: Lists historical static analysis runs.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — Paginated list of analysis runs.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}`
- **Purpose**: Retrieves metrics summary for a specific analysis run.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `AnalysisRunResponse`.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}/symbols`
- **Purpose**: Queries extracted AST symbol table.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `page`, `size`, `kind` (`CLASS`, `INTERFACE`, `METHOD`, `FIELD`, `ENUM`, `RECORD`).
- **Response**: `200 OK` — `PageResponse<SymbolResponse>`.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}/relationships`
- **Purpose**: Queries extracted static relationships between symbols.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `page`, `size`, `type` (`EXTENDS`, `IMPLEMENTS`, `CALLS`, `HAS_FIELD`).
- **Response**: `200 OK` — `PageResponse<RelationshipResponse>`.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}/metrics`
- **Purpose**: Queries file-level metrics (physical LOC, logical LOC, McCabe CC, Halstead, MI).
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<FileMetricsResponse>`.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}/findings`
- **Purpose**: Queries static quality rule violations.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `page`, `size`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`).
- **Response**: `200 OK` — `PageResponse<QualityFindingResponse>`.

### `GET /api/v1/repositories/{id}/analyses/{analysisId}/secrets`
- **Purpose**: Queries detected secret findings with masked evidence snippets.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<SecretFindingResponse>`.

---

## 5. Deterministic Reuse-First Engine Endpoints

### `POST /api/v1/repositories/{id}/reuse/analyze`
- **Purpose**: Executes deterministic multi-criteria reuse evaluation for a query intent.
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Request Body**: `ReuseAnalysisRequest` (`query`, `analysisId` optional).
- **Response**: `200 OK` — `ReuseAnalysisResponse` (`decision`, `overallScore`, `confidence`, `securityStatus`, `explanation`, `candidates`).

### `GET /api/v1/repositories/{id}/reuse`
- **Purpose**: Lists historical reuse evaluation runs.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<ReuseAnalysisResponse>`.

### `GET /api/v1/repositories/{id}/reuse/{analysisId}`
- **Purpose**: Retrieves a specific reuse analysis and its ranked candidates.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `ReuseAnalysisResponse`.

### `GET /api/v1/repositories/{id}/reuse/{analysisId}/candidates`
- **Purpose**: Retrieves candidate components with 8-dimensional scores, security gate status, and evidence citations.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `List<ReuseCandidateResponse>`.

---

## 6. Deterministic Security Analysis Endpoints

### `POST /api/v1/repositories/{id}/security/analyze`
- **Purpose**: Triggers deterministic AST security vulnerability scan (8 rules).
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Response**: `200 OK` — `SecurityAnalysisResponse` (`criticalCount`, `highCount`, `mediumCount`, `lowCount`, `totalFindings`).

### `GET /api/v1/repositories/{id}/security`
- **Purpose**: Lists historical security scan runs.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<SecurityAnalysisResponse>`.

### `GET /api/v1/repositories/{id}/security/latest`
- **Purpose**: Retrieves the latest security scan run for the repository.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `SecurityAnalysisResponse`.

### `GET /api/v1/repositories/{id}/security/{analysisId}`
- **Purpose**: Retrieves details of a specific security analysis run.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `SecurityAnalysisResponse`.

### `GET /api/v1/repositories/{id}/security/{analysisId}/findings`
- **Purpose**: Queries security findings with optional severity and category filters.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Query Params**: `page`, `size`, `severity`, `category`.
- **Response**: `200 OK` — `PageResponse<SecurityFindingResponse>`.

---

## 7. Deterministic Architecture Intelligence Endpoints

### `POST /api/v1/repositories/{id}/architecture/analyze`
- **Purpose**: Computes package coupling metrics, cyclic dependency chains, hotspots, and design smells.
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Response**: `200 OK` — `ArchitectureAnalysisResponse`.

### `GET /api/v1/repositories/{id}/architecture`
- **Purpose**: Lists historical architecture analyses.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<ArchitectureAnalysisResponse>`.

### `GET /api/v1/repositories/{id}/architecture/{analysisId}`
- **Purpose**: Retrieves coupling metrics, cycles, hotspots, and smells for a run. Supports lookup by primary key ID or analysis run ID.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `ArchitectureAnalysisResponse`.

### `GET /api/v1/repositories/{id}/architecture/{analysisId}/graph`
- **Purpose**: Returns node and edge models formatted for SVG/canvas graph rendering.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `ArchitectureGraphResponse` (`nodes`, `edges`, `cycles`, `totalPackages`, `totalDependencies`).

---

## 8. Grounded AI Reasoning Endpoints

### `POST /api/v1/repositories/{id}/ai/explain-reuse`
- **Purpose**: Synthesizes a grounded, citation-verified explanation of reuse feasibility.
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Request Body**: `AiReasoningRequest` (`reuseAnalysisId`, `query`, `userPrompt` optional).
- **Security Controls**: Prompt injection delimiters, secret masking, context budget cap (10 chunks / 16k chars / 4k tokens), sliding-window rate limit, citation validation.
- **Response**: `200 OK` — `AiReasoningResponse` (`summary`, `recommendation`, `reasoning` claims with citations, `limitations`, `confidence`, `telemetry`).

### `POST /api/v1/repositories/{id}/ai/explain-evidence`
- **Purpose**: Generates grounded explanation over specified evidence chunks.
- **Auth Required**: Yes (Owner, `ADMIN`).
- **Request Body**: `AiEvidenceExplanationRequest` (`evidenceType`, `query`).
- **Response**: `200 OK` — `AiReasoningResponse`.

### `GET /api/v1/repositories/{id}/ai/history`
- **Purpose**: Lists historical AI reasoning requests with token accounting.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `PageResponse<AiReasoningRequestResponse>`.

### `GET /api/v1/repositories/{id}/ai/requests/{requestId}`
- **Purpose**: Retrieves a specific AI reasoning interaction with telemetry.
- **Auth Required**: Yes (Owner, `ADMIN`, `AUDITOR`).
- **Response**: `200 OK` — `AiReasoningRequestResponse`.
