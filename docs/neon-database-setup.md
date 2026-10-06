# CodeMind AI — Neon PostgreSQL Setup & Integration Guide

**Document Version**: 1.0.0  
**Target Environment**: Neon Serverless PostgreSQL (`ep-polished-scene-azydfq2y`)  
**Status**: ACTIVE & VERIFIED  

---

## 1. Overview & Architecture

CodeMind AI utilizes **Neon Serverless PostgreSQL** as its persistent relational datastore, storing:
- User identities and role-based access control (RBAC) credentials
- Multi-tenant repository metadata and virtual file trees
- Deterministic AST analysis records, symbols, metrics, and relationships
- 8-dimensional code reuse evaluations and candidate scores
- Static security rule findings and severity assessments
- Architecture dependency graphs, package coupling metrics, and cycle detections
- Grounded AI reasoning prompts, token accounting, and cited evidence records
- Append-only security audit log events

```
React/Vite Frontend
        │
        │ REST + Stateless JWT
        ▼
Spring Boot Backend (Java 17)
        │
        │ JPA/Hibernate 6 + Flyway 10 + HikariCP
        ▼
Neon Serverless PostgreSQL
```

---

## 2. Environment Variables & Configuration

All database credentials and connection strings must be supplied exclusively via **environment variables**. Never commit real connection strings or passwords into source code, documentation, or Git repositories.

### Required Environment Variables

| Variable Name | Description | Example Placeholder |
| :--- | :--- | :--- |
| `DATABASE_URL` | Direct connection string to Neon PostgreSQL | `postgresql://<user>:<password>@<host>/<database>?sslmode=require&channel_binding=require` |
| `DATABASE_URL_POOLED` | Connection-pooled connection string via PgBouncer | `postgresql://<user>:<password>@<host>-pooler/<database>?sslmode=require&channel_binding=require` |
| `USE_ENV_DATABASE_URL` | Flag to enable dynamic environment URL resolution | `true` (default: `true` in base config) |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile | `dev` (with fallback to H2 if no `DATABASE_URL`) or `prod` |

### Optional / Future Variables
- `NEON_AI_GATEWAY_BASE_URL`: OpenAI-compatible endpoint URL for future LLM integration.
- `NEON_AI_GATEWAY_TOKEN`: Secret access token for AI Gateway (server-side only, never exposed to frontend).

---

## 3. How Spring Boot Connects to Neon

1. **Dynamic URL Adaptation**:  
   The backend includes [`DataSourceConfig.java`](file:///c:/Users/soman/Desktop/Act%20Mini/backend/src/main/java/com/codemind/config/DataSourceConfig.java), which transparently intercepts standard `postgresql://` or `postgres://` connection strings from `DATABASE_URL_POOLED` or `DATABASE_URL`, parses host, port, credentials, and SSL query parameters, and instantiates a high-performance `HikariDataSource` configured with the official `org.postgresql.Driver`.
2. **Connection Pooling**:  
   When `DATABASE_URL_POOLED` is set, the application automatically targets Neon's PgBouncer pooler endpoint, reducing serverless cold-start connection latency.

---

## 4. Flyway Database Migrations

CodeMind AI enforces database schema consistency using **Flyway 10**. Migrations execute automatically on application startup.

### Discovered & Applied Migration Versions
1. `V1__init_security_and_audit.sql` — Users, Repositories, Audit Logs.
2. `V2__repository_ingestion_and_files.sql` — Repository Files, Language Classification.
3. `V3__deterministic_static_analysis.sql` — Analysis Runs, Symbols, Relationships, File Metrics, Quality & Secret Findings.
4. `V4__reuse_analysis_engine.sql` — Reuse Analyses, Candidates, Evidence Spans.
5. `V5__ai_reasoning_requests.sql` — Grounded AI Reasoning Requests, Token Counts, Summaries.
6. `V6__security_and_architecture.sql` — Security Analyses, Findings, Architecture Graphs, Metrics & Cycles.

All 6 migrations successfully applied and verified in the Neon `flyway_schema_history` table.

---

## 5. Authentication & Tenant Isolation Invariant

- **CodeMind Authority**: Authentication is managed strictly by CodeMind's internal Spring Security layer with BCrypt password hashing and signed HMAC-SHA256 JWT tokens. Neon Auth is **not** used.
- **Tenant Isolation**: All repository entities link to their respective `owner_id`. Any attempt by an unauthorized tenant to access or inspect another user's repository triggers an audit warning and is rejected with `403 Forbidden`.

---

## 6. pgvector Readiness

- **Status**: Extension `vector` (version `0.8.6`) is available in Neon PostgreSQL.
- **Activation**: To enable vector index storage when activating semantic embeddings:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- **Retained Dimensions**: CodeMind maintains its standard embedding dimensionality without changing existing retrieval engines.

---

## 7. Local Development Setup

To run CodeMind AI against Neon PostgreSQL locally:

```powershell
# 1. Set the environment variable in your terminal session
$env:DATABASE_URL="postgresql://<user>:<password>@<host>/<database>?sslmode=require&channel_binding=require"
$env:USE_ENV_DATABASE_URL="true"

# 2. Run backend verification tests
cd backend
.\mvnw.cmd test -Dtest=NeonPostgreSqlIntegrationTest

# 3. Start the Spring Boot backend
.\mvnw.cmd spring-boot:run
```

---

## 8. Secret Management & Troubleshooting

### Security Safeguards
- Never commit `.env` files containing credentials (verified in `.gitignore`).
- Never pass database connection strings to Vite frontend bundles (`VITE_*`).
- Health endpoints (`/api/v1/health`) return only high-level status (`UP` / `CONNECTED`) without revealing hostnames or database connection strings.

### Common Connection Troubleshooting
1. **`Connection refused` / `SSL required`**:  
   Ensure the connection string includes `?sslmode=require&channel_binding=require`. Neon requires TLS/SSL on all connections.
2. **`Schema-validation: missing table`**:  
   Ensure Flyway is enabled (`spring.flyway.enabled=true`). Flyway must execute migrations before Hibernate schema validation runs.
