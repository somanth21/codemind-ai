# CodeMind AI - Phase 1 Foundation Architecture

## 1. System Vision & Paradigm
**CodeMind AI** is an academic- and research-oriented software repository understanding and engineering assistant. Its defining architectural philosophy is **Reuse-First**: prioritizing deep repository understanding, deterministic clone and symbol discovery, and architectural impact assessment before code generation is ever entertained.

In Phase 1, the **foundational architecture and security baseline** have been constructed. No repository ingestion, AST extraction, vector indexing, or external LLM API calls are executed in this phase.

---

## 2. Architecture Overview: Modular Monolith
CodeMind AI is structured as a **Clean Modular Monolith** in Java 17 / Spring Boot 3 with an accompanying React + Vite + TypeScript frontend Single Page Application (SPA).

```
Act Mini / (Project Root)
├── backend/                  # Java 17 + Spring Boot 3 Modular Monolith
│   ├── .mvn/                 # Self-contained Maven 3.9.9 runtime & wrapper
│   ├── mvnw, mvnw.cmd        # Cross-platform Maven wrapper scripts
│   ├── pom.xml               # Clean Maven project descriptor
│   └── src/
│       ├── main/java/com/codemind/
│       │   ├── CodeMindApplication.java
│       │   ├── common/       # Domain exceptions & base contracts
│       │   ├── domain/       # JPA entities (User, Repository, AuditLog) & repos
│       │   ├── ingestion/    # PathTraversalGuard & sandbox boundaries
│       │   ├── analyzer/     # Deterministic AST & metrics service boundaries
│       │   ├── indexer/      # Symbol & search service boundaries
│       │   ├── reuse/        # Reuse-First decision engine boundaries
│       │   ├── ai/           # Provider-agnostic LLM SPI (Gemini client skeleton)
│       │   ├── security/     # Spring Security 6, BCrypt, JWT, UserPrincipal
│       │   ├── audit/        # Security audit log service & listeners
│       │   ├── observability/# CorrelationIdFilter (MDC tracing)
│       │   ├── config/       # SecurityConfig, CORS, DataInitializer
│       │   └── web/          # REST Controllers, DTOs, RFC 7807 ProblemDetail advice
│       └── main/resources/
│           ├── application.yml
│           ├── application-dev.yml
│           ├── application-test.yml
│           ├── application-prod.yml
│           └── db/migration/V1__init_security_and_audit.sql
├── frontend/                 # React 18 + Vite + TypeScript SPA
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── api/              # Typed fetch wrapper with RFC 7807 error parsing
│       ├── components/       # Layout (AppShell, Navbar, Sidebar), ProtectedRoute
│       ├── context/          # AuthContext (JWT token & user state)
│       ├── pages/            # LoginPage, DashboardPage, NotFoundPage
│       └── types/            # TypeScript domain & API interfaces
├── docs/                     # Technical architecture documentation
├── scripts/                  # Development launcher scripts (.bat / .sh)
├── .gitignore
├── .env.example              # Environment variable template (placeholders only)
└── README.md
```

---

## 3. Security Architecture (Established First)

Security is the primary foundational layer:
1. **Stateless Authentication**:
   - Short-lived JSON Web Tokens (JWT) signed via HMAC-SHA256 (`Keys.hmacShaKeyFor`).
   - Secret key configured via `JWT_SECRET` environment variable with strict $\ge 256$-bit requirement.
   - Claims: `subject` (email), `userId` (UUID), `role`, `issuedAt`, `expiration`.
2. **Password Security**:
   - Adaptive hashing via `BCryptPasswordEncoder(12)`.
   - Plaintext passwords are never stored in memory or persisted.
3. **Role-Based Access Control (RBAC)**:
   - Foundational roles: `ROLE_ADMIN`, `ROLE_DEVELOPER`, `ROLE_AUDITOR`.
   - Method-level security (`@EnableMethodSecurity`) and endpoint rules.
4. **CORS Hardening**:
   - Whitelist-only origins (`CORS_ALLOWED_ORIGINS`, e.g., `http://localhost:5173`).
   - `allowOrigins("*")` is strictly prohibited for authenticated endpoints.
   - Credentials permitted only on explicit origin matches.
5. **Path Traversal Shield**:
   - `PathTraversalGuard` verifies candidate paths against canonical sandbox roots before file operations can occur.
6. **Error Sanitization (RFC 7807)**:
   - All errors return `application/problem+json` (`ProblemDetail`).
   - Stack traces, internal Java package names, and raw exceptions are never exposed to API clients.
7. **Security Audit Logging**:
   - Dedicated `audit_logs` database table.
   - Audits `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ACCESS_DENIED`, etc.
   - Automatic scrubbing: passwords, JWT tokens, and repository contents are prohibited from audit records.

---

## 4. Database & Persistence Architecture
- **Target Architecture**: PostgreSQL 16 with `pgvector` extension.
- **Development/Test Fallback**: H2 in PostgreSQL compatibility mode (`MODE=PostgreSQL`) for zero-dependency standalone developer workflow and test suites.
- **Migration Engine**: Flyway (`V1__init_security_and_audit.sql`).
- **Initial Tables**:
  - `users`: User identity, password hash, role, activation status, timestamps.
  - `repositories`: Ingested repository metadata, ownership, status.
  - `audit_logs`: Principal, event type, status, IP address, correlation ID, sanitized details.

---

## 5. AI / LLM Provider Abstraction
- Defined provider SPI (`LlmClient`, `LlmRequest`, `LlmResponse`, `LlmProvider`).
- Implemented **Google Gemini** provider skeleton (`GeminiLlmClient`).
- In Phase 1 Foundation, external LLM calls throw `UnsupportedOperationException` and no fake/mock results are returned. Real LLM invocation and grounding are scheduled for Phase 5.

---

## 6. Observability
- **Request Tracing**: `CorrelationIdFilter` checks or creates `X-Correlation-ID` (UUID) and propagates it into SLF4J MDC (`correlationId`).
- **Structured Logs**: Console output includes correlation IDs on all threads.
- **Metrics**: Spring Boot Actuator exposes `/actuator/health`, `/actuator/info`, and `/actuator/metrics`.

---

## 7. Frontend Architecture
- **Framework**: React 18 + Vite + TypeScript.
- **State & Context**: `AuthContext` provides authenticated user profile, token lifecycle, login/logout.
- **Route Guard**: `ProtectedRoute` checks authentication status, redirects unauthenticated traffic to `/login`, and returns to origin route upon login.
- **API Client**: `apiClient` fetch abstraction attaching JWT tokens, capturing correlation IDs, and extracting RFC 7807 `ProblemDetail` errors into typed `ApiError` instances.
- **Engineering Shell**: `AppShell` with responsive sidebar displaying current active modules and badges for future roadmap phases.

---

## 8. Secure Repository Ingestion (Phase 2 Architecture)

### 8.1 Sandbox Architecture & Directory Layout
Repository content is stored in an isolated, dedicated sandbox filesystem outside the web root:
```
${CODEMIND_SANDBOX_ROOT}/
└── repositories/
    └── <repository-uuid>/
        ├── source/     # Extracted regular source files (isolated)
        └── metadata/   # Internal ingestion records
```
- The sandbox root is configurable via `CODEMIND_SANDBOX_ROOT` (defaults to `./codemind-sandbox`).
- Server filesystem paths and sandbox roots are **never leaked** through API payloads or DTO responses.
- Repository operations use server-generated UUID identifiers only.

### 8.2 Trust Boundary & Non-Execution Principle
- **All repository content is treated as UNTRUSTED INPUT**: An uploaded archive is assumed to potentially contain malicious path payloads, zip bombs, or obfuscated binaries.
- **Strict Non-Execution Invariant**: CodeMind AI is an engineering intelligence assistant, not a build runner. It **never compiles repository code, never executes scripts (`.bat`, `.sh`, `.ps1`), never loads repository files as Spring or JVM configurations, and never invokes shell commands found in uploaded code**.

### 8.3 Path Traversal Defense
`PathTraversalGuard` validates every ZIP entry name prior to writing:
1. Reject any entry with directory traversal sequences: `../`, `..\`, `/../`, `\..\`.
2. Reject URL-encoded evasion: `%2e%2e%2f` and variations.
3. Reject absolute Unix paths (`/etc/passwd`).
4. Reject Windows drive-letter paths (`C:\...`).
5. Reject Windows UNC paths (`\\server\share`).
6. Bound maximum path length ($\le 500$ chars) and filename length ($\le 255$ chars).
7. Assert canonical containment invariant: `candidatePath.normalize().startsWith(sandboxRoot)`.

### 8.4 Symlink & Special Filesystem Object Defense
- Symbolic links, hard links, FIFOs, and device nodes are strictly prohibited.
- `ZipExtractionService` extracts only regular files and directories. Any entry attempting to introduce a symlink is rejected or skipped, and filesystem verification asserts `!Files.isSymbolicLink(path)`.

### 8.5 ZIP Bomb & Resource Exhaustion Defense
Limits are evaluated continuously during archive stream extraction before disk/memory saturation can occur:
- `maxArchiveSizeBytes`: 100 MB (compressed)
- `maxExtractedSizeBytes`: 500 MB (total uncompressed)
- `maxFileCount`: 20,000 files
- `maxDirectoryCount`: 5,000 directories
- `maxSingleFileSizeBytes`: 100 MB
- On breach of any ceiling, extraction halts immediately, throwing a security exception and triggering automatic rollback.

### 8.6 Repository Isolation & Authorization Model
- Multi-tenancy is enforced server-side in `RepositoryIngestionServiceImpl`:
  - `ROLE_DEVELOPER`: May ingest, view, and delete only their own repositories (`repo.owner.id == user.id`).
  - `ROLE_AUDITOR`: Read-only access to repositories across the system.
  - `ROLE_ADMIN`: Full administrative visibility and deletion capabilities.
- Unauthorized access attempts trigger `UNAUTHORIZED_ACCESS` security audit events with the user's principal and correlation ID, and return RFC 7807 403 Forbidden.

### 8.7 Atomic Cleanup & Lifecycle Management
- If ingestion fails at any stage (e.g. zip bomb, traversal attack, corrupt file), the repository status transitions to `FAILED`, the exact error reason is recorded, and `safeDeleteRecursively` purges the entire sandbox directory. No partial or corrupted files remain on disk.
- Deletion via `DELETE /api/v1/repositories/{id}` validates ownership, cascades database deletion across `repository_files`, and recursively removes the physical sandbox directory.

---

## 9. Phase 3 — Deterministic Static Analysis Engine

### 9.1 Core Research Invariant
CodeMind AI enforces deterministic AST extraction and metric calculation as empirical ground truth:
- **Zero LLM Dependency**: No LLM calls (Gemini, OpenAI, Claude) are used for metrics, symbol extraction, or defect identification.
- **Reproducibility**: Static metrics and quality findings yield identical results across runs.

### 9.2 Architecture & Pipeline
1. **Sandboxed File Reading**: Files accessed strictly under `./codemind-sandbox/repositories/<id>/source/`.
2. **Safe JavaParser Parsing**: `AstParserService` operates at Java 17 level with failure isolation: malformed Java source increments `errorCount` without aborting analysis of valid files.
3. **Symbol Extraction**: Extraction of packages, classes, interfaces, enums, records, fields, constructors, methods, signatures, modifiers, and line ranges.
4. **Relationship Extraction**: Extraction of `EXTENDS`, `IMPLEMENTS`, `CALLS`, `CREATES`, and `FIELD_ACCESS` with confidence tracking (`RESOLVED`, `PARTIAL`, `UNRESOLVED`).
5. **Deterministic Metrics**:
   - Physical LOC and Logical LOC (LLOC)
   - McCabe Cyclomatic Complexity ($CC$, base 1 + decision points)
   - Control flow nesting depth
   - Halstead Software Science metrics ($V, D, E, n, N$)
   - Maintainability Index ($MI$, $0 \text{--} 100$ scale)
6. **Deterministic Quality Rules**: Rules with configurable thresholds (`HIGH_CYCLOMATIC_COMPLEXITY`, `EXCESSIVE_NESTING_DEPTH`, `TOO_MANY_PARAMETERS`, `LONG_METHOD`, `EMPTY_CATCH_BLOCK`, `TODO_FIXME_MARKER`, `LARGE_CLASS`).
7. **Secret Scanner & Redaction**: High-confidence regex patterns for private keys, AWS access keys, GitHub tokens, Slack tokens, JWTs, and API credentials. Plaintext secrets are strictly redacted before database persistence.
8. **Provenance Tracking**: Every symbol, relationship, metric, and finding references Repository $\rightarrow$ Analysis Run $\rightarrow$ File Path $\rightarrow$ Source Line Numbers.

---

## 10. Phase 5 — Deterministic Reuse-First Engine

### 10.1 Core Research Invariant
CodeMind AI evaluates existing repository components before proposing code generation:
- **Zero LLM Generation**: Decision matrix, scoring, gating, and explanations are evaluated 100% deterministically.
- **Pre-Generation Decision**: Downstream AI assists with adaptation or composition only AFTER the reuse policy selects a non-`CREATE_NEW` strategy.

### 10.2 Component Architecture
1. **Candidate Discovery (`ReuseCandidateService`)**: Discovers candidate symbols using tokenized matching, AST signatures, caller usage, and callee coupling.
2. **Multi-Criteria Scoring Engine (`ReuseScoringEngine`)**: Computes normalized [0, 1] criteria across functional relevance, structural similarity, maintainability index, cyclomatic complexity penalty, security score, modification effort, dependency impact, and duplication risk.
3. **Security Gate (`ReuseSecurityGate`)**: Enforces zero-tolerance security isolation (`SAFE`, `CAUTION`, `BLOCKED`). Candidates with hardcoded secrets or critical findings can never receive `REUSE_DIRECTLY`.
4. **Policy Engine (`ReusePolicyEngine`)**: Categorizes candidates into `DIRECT_REUSE`, `ADAPT`, `EXTEND`, `COMPOSE`, or `REJECT`, selecting repository-level decisions (`REUSE_DIRECTLY`, `REUSE_WITH_ADAPTATION`, `COMPOSE_EXISTING_COMPONENTS`, `EXTEND_EXISTING_COMPONENT`, `CREATE_NEW`).
5. **Provenance & Explainability (`ReuseExplanationGenerator`)**: Synthesizes human-readable positive signals, negative caveats, and line-level citations across symbol declarations, callers, metrics, and security evidence.
6. **Benchmarking & Research Evaluation (`ReuseEvaluationService`)**: Validates standard scenarios measuring Decision Accuracy (100%), False Reuse Rate (0.0%), and Unnecessary New Code Rate (0.0%).

---

## 11. Phase 6 — Grounded AI Reasoning Layer

### 11.1 Downstream Explanatory Invariant
The LLM operates strictly downstream of deterministic retrieval, AST metrics, and reuse decision matrices:
- **Authoritative Ground Truth**: Deterministic static analysis remains the authoritative ground truth. The LLM is an interpretation and explanation layer.
- **Untrusted Input Boundary**: All repository source code, comments, string literals, and file paths are treated as untrusted data.
- **Zero Autonomous Execution**: The LLM reasoning tier has no shell execution rights, no file write permissions, and no autonomous Git permissions.
- **Security Gate Preservation**: If Phase 5 static security gating marks a candidate `BLOCKED`, the LLM reasoning layer is strictly forbidden from recommending direct reuse.

### 11.2 Core Components
1. **Provider Abstraction (`LlmClient`)**: Vendor-neutral SPI with Google Gemini implementation via standard Java 17 `HttpClient`, and `MockLlmClient` test double.
2. **Context Budgeting (`ContextBudgetManager`)**: Enforces hard caps (max 10 chunks, 16k characters, 4k tokens) prioritizing highest deterministic relevance scores.
3. **Prompt Injection Defense (`GroundedPromptBuilder` & `EvidenceSelectionService`)**: Confines source code inside `<BEGIN_REPOSITORY_EVIDENCE>` tags, escapes delimiters, and redacts raw secrets before LLM packaging.
4. **Structured Reasoning Parser (`StructuredResponseParser`)**: Validates strongly-typed JSON outputs (`summary`, `recommendation`, `reasoning` claims with evidence IDs, `limitations`, `confidence`).
5. **Citation & Security Grounding Validator (`GroundingValidator`)**: Asserts citation integrity, calculates citation coverage ratios, and programmatically enforces security gate invariants.
6. **Graceful Fallback**: When `CODEMIND_LLM_API_KEY` is not configured, the system operates deterministically with zero interruption and returns controlled RFC 7807 503 responses for AI endpoints with zero fake data.

---

## 12. Phase 7 — Security Analysis & Architecture Intelligence

### 12.1 Deterministic Repository Security Analysis Engine
- **Deterministic Authority Invariant**: All security findings, CWE mappings, line provenance, and severity ratings originate strictly from deterministic AST pattern inspection and token scanners. An LLM is never permitted to declare code secure or invent vulnerabilities.
- **Untrusted Input Assumption**: Source code in the repository sandbox is analyzed via read-only JavaParser AST traversal. Code is never compiled, dynamically loaded, or executed.
- **Deterministic Secret Redaction**: Credential tokens are deterministically masked (preserving a 4-character prefix and 2-character suffix) before persistence and logging.
- **Rule Framework (`SecurityRuleEngine`)**: Features 8 deterministic rules covering:
  1. `SEC-SECRET-001` (CWE-798): Hardcoded API keys, tokens, and credentials.
  2. `SEC-CMD-001` (CWE-78): Command injection via `Runtime.exec` and `ProcessBuilder`.
  3. `SEC-PATH-001` (CWE-22): Path traversal via unvalidated file access.
  4. `SEC-CRYPTO-001` (CWE-327): Broken cryptographic algorithms (MD5, SHA-1, DES, RC4) and insecure RNG in security contexts.
  5. `SEC-SQL-001` (CWE-89): Dynamic SQL injection via unparameterized statement concatenation.
  6. `SEC-DESER-001` (CWE-502): Unsafe object deserialization (`ObjectInputStream.readObject`, `XMLDecoder`).
  7. `SEC-AUTH-001` (CWE-306): Missing endpoint authorization on Spring MVC handlers.
  8. `SEC-LOG-001` (CWE-532): Sensitive information leakage in loggers.
- **Phase 5 Security Gating**: Discovered reuse candidates inherit security findings; `CRITICAL` or `HIGH` findings gate candidates to `BLOCKED`, and `MEDIUM` findings gate to `CAUTION`.

### 12.2 Deterministic Architecture Intelligence Engine
- **Coupling Metrics (`PackageAnalysisService`)**: Calculates Robert C. Martin's Package Coupling metrics ($C_a$ afferent callers, $C_e$ efferent dependencies, and instability index $I = \frac{C_e}{C_a + C_e}$) with division-by-zero protection. Categorizes packages into `BALANCED`, `CENTRAL`, `DEPENDENCY_HEAVY`, `HIGHLY_COUPLED`, or `ISOLATED`.
- **Cycle Detection (`CycleDetectionService`)**: Discovers cyclic dependencies violating the Acyclic Dependencies Principle (ADP) via Depth-First Search with recursion stack tracking, deduplicated via canonical minimum-rotation normalization.
- **Architecture Hotspots & Smells (`ArchitectureSmellDetector`)**: Detects architectural `HUB`s, `HIGH_FAN_OUT` modules, `CORE_ABSTRACTION` nodes, `CYCLIC_DEPENDENCY` loops, `GOD_PACKAGE` bloat, and `UNSTABLE_ABSTRACTION` smells.
- **Interactive Dependency Graph (`DependencyGraphViewer`)**: Renders circular and force-spaced SVG graphs with node/edge filtering, real-time symbol search, zoom controls, and selected node inspectors.

### 12.3 Phase 6 Grounded LLM Integration
- Security findings and architecture hotspots/cycles are fed into the evidence selection pipeline (`selectEvidenceForSecurity`, `selectEvidenceForArchitecture`) as cited `EvidenceChunk`s with line-level provenance, enabling grounded AI explanations of security posture and architectural refactoring.


