# CodeMind AI
> **"AI-Powered Software Repository Understanding and Engineering Assistant"**

[![Java](https://img.shields.io/badge/Java-17%20LTS-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/Target-PostgreSQL%20%2B%20pgvector-informational.svg)](https://github.com/pgvector/pgvector)
[![Security](https://img.shields.io/badge/Security-Spring%20Security%206%20%2F%20JWT-red.svg)](https://spring.io/projects/spring-security)

---

## 1. What CodeMind AI Is

**CodeMind AI** is an academic- and research-oriented software engineering assistant designed to understand entire software repositories. 

Unlike traditional generative coding assistants that immediately generate new code, CodeMind AI is designed around a **Reuse-First Workflow**:
1. Comprehensively map the codebase using deterministic Abstract Syntax Trees (ASTs), symbol tables, and call graphs.
2. Exhaustively locate existing implementations, abstractions, and utility modules before contemplating new code generation.
3. Formulate evidence-grounded recommendations evaluating architectural coupling, cyclomatic complexity, maintainability impact, and security risks.
4. Synthesize verifiable, explainable insights with provenance tracking back to exact lines of code.

---

## 2. Research Contribution

CodeMind AI investigates an architectural alternative to generation-first AI assistants:
- **Core Problem**: Conventional coding assistants default to generating new code without sufficiently evaluating existing codebase capabilities, resulting in code duplication, maintainability degradation, and architectural drift.
- **Proposed Approach**: An integrated framework where **deterministic repository evidence is authoritative**, and downstream LLMs operate strictly as explanatory interpreters over verified evidence.
- **Deterministic Intelligence**: Mathematical calculation of McCabe Cyclomatic Complexity, Halstead volume, bounded Maintainability Index, and AST symbol tables via `JavaParser`.
- **Reuse-First Analysis**: Multi-criteria candidate scoring across 8 dimensions (functional, structural, maintainability, complexity, security, effort, dependency, duplication) to evaluate reuse feasibility before code synthesis.
- **Security-Aware Gating**: Deterministic AST rules (CWE-798, CWE-78, CWE-22, CWE-327, CWE-89, CWE-502, CWE-306, CWE-532) gate vulnerable candidates to `BLOCKED`, preventing automated reuse of vulnerable code.
- **Architecture Intelligence**: Robert C. Martin's Package Coupling ($C_a, C_e, I$), provable DFS cycle detection with canonical rotation deduplication, and architectural hotspot analysis.
- **Grounded AI Reasoning**: Context-budgeted evidence packaging with prompt injection defenses, structured JSON schemas, and programmatic citation validation (`[E#]`).
- **Evaluation Methodology**: Formal experimental protocol measuring Retrieval (Precision@K, MRR), Reuse Decision Accuracy, False Reuse Rate, Security Precision/Recall, and Citation Coverage Ratio. Detailed in [`docs/research-contribution.md`](docs/research-contribution.md) and [`docs/evaluation-plan.md`](docs/evaluation-plan.md).

---

## 3. Architecture Overview

CodeMind AI is structured as a **Clean Modular Monolith**:
- **Backend**: Spring Boot 3 on Java 17 LTS organized into cohesive domain modules with strict package boundaries.
- **Frontend**: Single Page Application built with React 18, Vite, and TypeScript.
- **Persistence Tier**: PostgreSQL 16 with `pgvector` as the primary production target, with an in-memory H2 fallback profile for standalone local development and automated testing.
- **Boundary Philosophy**: Complete separation between **deterministic static analysis** (AST parsing, metrics, secret scanning) and **probabilistic LLM reasoning**. LLM reasoning is only invoked for high-level synthesis grounded on deterministic facts.

---

## 4. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Java 17 LTS, Spring Boot 3.3.4, Spring Security 6, Spring Data JPA, Flyway, JJWT 0.12.6, JavaParser 3.26.1 |
| **Frontend** | React 18, Vite 5, TypeScript 5.5, React Router 6, Lucide Icons |
| **Database** | PostgreSQL 16 + pgvector (Production Target) / H2 Database (Dev & Test Fallback) |
| **Build & Tooling** | Maven 3.9.9 (via self-contained Maven Wrapper `mvnw`), npm 11 |
| **Testing** | JUnit 5, Mockito, Spring Security Test, Vitest, React Testing Library, Jest DOM |

---

## 5. Local Development Requirements

- **Java JDK**: Version 17 LTS (verified with `java -version`)
- **Node.js**: Version 18+ or 20+ (Node v24.13.0 and npm 11.6.2 detected)
- **Maven**: *No global installation required*. The project includes `mvnw.cmd` (Windows) and `mvnw` (Linux/macOS).
- **PostgreSQL**: Optional for local testing. Development profile runs out of the box with the embedded H2 dev fallback.

---

## 6. Environment Variables

Copy `.env.example` to `.env` to customize settings:

```bash
# Server & Profile
SERVER_PORT=8080
SPRING_PROFILES_ACTIVE=dev

# Database (PostgreSQL Target)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=codemind_db
DB_USER=codemind_user
DB_PASSWORD=your_secure_password_here

# Security & JWT
JWT_SECRET=your_32_character_minimum_secret_key_here
JWT_EXPIRATION_MS=900000

# CORS Whitelist
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# LLM Provider Abstraction
LLM_PROVIDER=GEMINI
LLM_API_KEY=your_gemini_api_key_placeholder
LLM_MODEL=gemini-1.5-pro
```

> **Security Rule**: Never commit `.env` or production secrets to Git. `.env` is ignored by `.gitignore`.

---

## 7. How to Run the Backend

### Windows (PowerShell / Command Prompt):
```powershell
# Using the Maven Wrapper directly
cd backend
.\mvnw.cmd spring-boot:run

# Or using the launcher script
.\scripts\run-backend.bat
```

### Linux / macOS:
```bash
cd backend
./mvnw spring-boot:run

# Or using the launcher script
./scripts\run-backend.sh
```

- Backend server starts at: `http://localhost:8080`
- Public Health Check: `http://localhost:8080/api/v1/health`
- Spring Boot Actuator: `http://localhost:8080/actuator/health`

### Running Backend Tests:
```powershell
cd backend
.\mvnw.cmd test
```

---

## 8. How to Run the Frontend

### Development Mode:
```powershell
cd frontend
npm install
npm run dev

# Or using the launcher script
.\scripts\run-frontend.bat
```

- Frontend development server starts at: `http://localhost:5173`
- Default seeded developer account:
  - **Email**: `developer@codemind.ai`
  - **Password**: `DevSecure123!`

### Running Frontend Tests & Production Build:
```powershell
cd frontend
npm test          # Vitest test suite (16 tests)
npm run build     # TypeScript check & production bundle build
```

---

## 9. Security Principles

CodeMind AI adheres to rigorous security-by-design standards:
1. **Zero Hardcoded Secrets**: All credentials, tokens, and keys are externalized through environment variables.
2. **Stateless JWT Security**: Short-lived access tokens signed using HMAC-SHA256 with strict 256-bit key length validation.
3. **Adaptive Password Hashing**: BCrypt with work factor 12. Plaintext passwords are never stored.
4. **Strict CORS Policy**: Authenticated endpoints explicitly restrict origins (`http://localhost:5173`). Wildcard `*` origins are forbidden.
5. **Sanitized Error Responses**: Implements RFC 7807 `ProblemDetail`. Stack traces and internal Java class details are never leaked.
6. **Immutable Audit Logging**: Security events (`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCESS_DENIED`, `SECURITY_ANALYSIS_STARTED`, etc.) are logged to an audit table with automatic scrubbing of sensitive fields.
7. **Path Traversal Defense**: Dedicated `PathTraversalGuard` ensures all candidate paths remain within strict canonical sandbox boundaries.
8. **Sandbox Isolation & Non-Execution**: Repository files are unpacked into physically isolated sandboxes and strictly analyzed in read-only mode without code execution.

---

## 10. Implementation Status (Phases 1–7 Completed)

- [x] **Project Foundation (Phase 1)**: Clean workspace structure (`backend/`, `frontend/`, `docs/`, `scripts/`).
- [x] **Security Engine (Phase 1)**: Spring Security 6, BCrypt (strength 12), JWT provider & filter, RBAC (`ROLE_ADMIN`, `ROLE_DEVELOPER`, `ROLE_AUDITOR`).
- [x] **Database Migrations (Phases 1–7)**: Flyway V1 through V6.
- [x] **Secure Ingestion & Sandbox (Phase 2)**: Multipart ZIP upload, `PathTraversalGuard`, Zip Bomb quotas, NUL binary scanner, language classification.
- [x] **Deterministic Static Analysis (Phase 3)**: JavaParser AST symbols, call relationships, McCabe CC, Halstead, Maintainability Index, quality rules, secret scanner.
- [x] **Hybrid Retrieval & Evidence Index (Phase 4)**: Normalized chunks, lexical inverted index, dense embeddings in pgvector, RRF fusion.
- [x] **Deterministic Reuse-First Engine (Phase 5)**: 8-dimensional multi-criteria scoring, security gating (`SAFE`, `CAUTION`, `BLOCKED`), policy engine (`REUSE_DIRECTLY`, `ADAPT`, `COMPOSE`, `EXTEND`, `CREATE_NEW`).
- [x] **Grounded AI Reasoning (Phase 6)**: Downstream explanatory tier, context budgeting, prompt injection defense, structured JSON schema parsing, automated citation validation (`[E#]`).
- [x] **Security & Architecture Intelligence (Phase 7)**: 8 deterministic AST security rules (CWE-798, CWE-78, CWE-22, CWE-327, CWE-89, CWE-502, CWE-306, CWE-532), Robert C. Martin's Package Coupling ($C_a, C_e, I$), DFS cycle detection with canonical rotation deduplication, architectural hotspots, and interactive SVG dependency graph.
- [x] **Automated Tests**: **132 backend tests passing (100%)**, **16 frontend tests passing (100%)**, frontend production build verified.

---

## 11. Key API Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health` | Service health status & correlation ID | No |
| `POST` | `/api/v1/auth/login` | Authenticate user & issue JWT bearer token | No |
| `GET` | `/api/v1/auth/me` | Current authenticated user profile | Yes |
| `POST` | `/api/v1/repositories` | Upload & securely ingest ZIP repository | Yes (`DEVELOPER`, `ADMIN`) |
| `GET` | `/api/v1/repositories` | List accessible repositories | Yes |
| `GET` | `/api/v1/repositories/{id}` | Ingestion details and metadata summary | Yes |
| `DELETE` | `/api/v1/repositories/{id}` | Delete repository from DB and sandbox | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/tree` | Hierarchical repository file tree | Yes |
| `GET` | `/api/v1/repositories/{id}/files` | Filterable, paginated file metadata | Yes |
| `GET` | `/api/v1/repositories/{id}/files/content?path=...` | Read-only text file content viewer | Yes |
| `POST` | `/api/v1/repositories/{id}/analyze` | Trigger deterministic static analysis | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/analyses` | List historical analysis runs (paginated) | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}` | Get specific analysis run metrics | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}/symbols` | Query AST symbol table (paginated, kind filter) | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}/relationships` | Query structural call/type relationships | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}/metrics` | Query file-level metrics (LOC, CC, MI, Halstead) | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}/findings` | Query quality rule defects (paginated, severity filter) | Yes |
| `GET` | `/api/v1/repositories/{id}/analyses/{analysisId}/secrets` | Query detected secrets with strict redaction | Yes |
| `POST` | `/api/v1/repositories/{id}/reuse/analyze` | Execute deterministic multi-criteria reuse evaluation | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/reuse` | List historical reuse analyses (paginated) | Yes |
| `GET` | `/api/v1/repositories/{id}/reuse/{analysisId}` | Get detailed reuse decision, scores, and candidates | Yes |
| `GET` | `/api/v1/repositories/{id}/reuse/{analysisId}/candidates` | List candidates with provenance and evidence | Yes |
| `POST` | `/api/v1/repositories/{id}/ai/explain-reuse` | Grounded LLM explanation of reuse feasibility with citations | Yes (Owner, `ADMIN`) |
| `POST` | `/api/v1/repositories/{id}/ai/explain-evidence` | Grounded LLM interpretation of repository evidence | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/ai/history` | Paginated AI reasoning request history | Yes |
| `GET` | `/api/v1/repositories/{id}/ai/requests/{requestId}` | Detailed AI explanation request with token accounting | Yes |
| `POST` | `/api/v1/repositories/{id}/security/analyze` | Trigger deterministic AST security vulnerability scan | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/security` | List historical security runs (paginated) | Yes |
| `GET` | `/api/v1/repositories/{id}/security/latest` | Retrieve latest security run and KPI counts | Yes |
| `GET` | `/api/v1/repositories/{id}/security/{analysisId}` | Get specific security analysis run details | Yes |
| `GET` | `/api/v1/repositories/{id}/security/{analysisId}/findings` | Query security findings (severity/category filter) | Yes |
| `POST` | `/api/v1/repositories/{id}/architecture/analyze` | Calculate package coupling, cycles, and hotspots | Yes (Owner, `ADMIN`) |
| `GET` | `/api/v1/repositories/{id}/architecture` | List historical architecture analyses (paginated) | Yes |
| `GET` | `/api/v1/repositories/{id}/architecture/{analysisId}` | Get coupling metrics, cycles, hotspots, and smells | Yes |
| `GET` | `/api/v1/repositories/{id}/architecture/{analysisId}/graph` | Full node/edge graph data for SVG visualization | Yes |

---

## 11. Planned Roadmap

```
Phase 1: Foundation & Security Baseline [COMPLETED]
    ↓
Phase 2: Secure Repository Ingestion & Sandbox [COMPLETED]
    ↓
Phase 3: Deterministic Static Analysis Engine [COMPLETED]
    ↓
Phase 4: Hybrid Repository Search & Evidence Index [COMPLETED]
    ↓
Phase 5: Deterministic Reuse-First Engine [COMPLETED]
    ↓
Phase 6: Grounded AI Reasoning Layer & Provenance Verification [COMPLETED]
    ↓
Phase 7: Deterministic Security Analysis & Architecture Intelligence [COMPLETED]
```
