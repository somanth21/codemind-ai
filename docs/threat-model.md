# CodeMind AI — Security Threat Model (STRIDE)

This document formalizes the threat model for CodeMind AI using the Microsoft STRIDE methodology. It defines protected system assets, enumerates threat vectors across trust boundaries, details implemented architectural mitigations, and documents residual risks.

> **Security Principle**: Absolute security is impossible. All mitigations are qualified by their realistic residual risk.

---

## 1. System Assets

| Asset ID | Asset Name | Description & Sensitivity |
|---|---|---|
| **A1** | **Repository Source Code** | Proprietary source files, internal comments, and architectural implementations extracted into sandboxes. High confidentiality and integrity. |
| **A2** | **User Credentials** | User emails, BCrypt password hashes, and active HMAC-SHA256 JWT tokens. Critical confidentiality and integrity. |
| **A3** | **Repository Metadata** | File trees, hashes, language tags, and AST symbol tables. High integrity. |
| **A4** | **Semantic Embeddings** | Dense vector representations stored in PostgreSQL `pgvector`. Moderate confidentiality. |
| **A5** | **Security Findings** | Discovered vulnerability locations, CWE identifiers, and redacted secret evidence. High confidentiality. |
| **A6** | **AI Prompts & Responses** | Context chunks, system instructions, and generated reasoning outputs. High confidentiality. |
| **A7** | **Security Audit Logs** | Append-only records of user actions, authentication events, and administrative operations. Critical integrity and non-repudiation. |

---

## 2. STRIDE Threat Analysis Matrix

### 2.1 Spoofing (Identity Spoofing)
- **Threat**: An attacker impersonates a valid user or tenant to access private repositories or trigger AI reasoning.
- **Attack Surface**: `POST /api/v1/auth/login`, JWT Bearer token parsing on API endpoints.
- **Implemented Mitigation**:
  - Stateless HMAC-SHA256 signed JWTs with strict secret length ($\ge 256$ bits) and short expiration window (15 minutes).
  - BCrypt password hashing (work factor 12) prevents brute-force credential stuffing.
  - Multi-tenant IDOR checks verify `repo.owner.id == requester.id` or `ROLE_ADMIN`.
- **Residual Risk**: *Low*. Compromise of client machine memory could leak active 15-minute JWT tokens before expiry.

---

### 2.2 Tampering (Data Tampering)
- **Threat 1: Zip Slip / Path Traversal**: An uploaded ZIP archive contains relative traversal paths (`../../etc/passwd`) to overwrite host system files.
- **Attack Surface**: `POST /api/v1/repositories` (ZIP extraction).
- **Implemented Mitigation**:
  - `PathTraversalGuard` decodes, normalizes, and verifies that every extracted entry resolves strictly within `sandboxRoot`.
  - Rejects `..`, absolute paths, Windows drive prefixes, UNC shares, symlinks, and device files before filesystem touch.
- **Residual Risk**: *Low*. Dependent on underlying Java `Path.normalize()` correctness across Windows and POSIX filesystem drivers.

- **Threat 2: SQL Injection**: Malicious user inputs alter database queries.
- **Attack Surface**: Query parameters in search, reuse, and filtering endpoints.
- **Implemented Mitigation**:
  - Spring Data JPA with parameterized Hibernate queries; zero raw dynamic string concatenation.
- **Residual Risk**: *Negligible*.

---

### 2.3 Repudiation (Disavowal of Actions)
- **Threat**: A user performs unauthorized actions (e.g., repository deletion, security scans) and claims they did not.
- **Attack Surface**: Mutating API endpoints across all controllers.
- **Implemented Mitigation**:
  - Dedicated `audit_logs` database table.
  - Mandatory audit events: `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `REPO_REGISTERED`, `INGESTION_COMPLETED`, `ANALYSIS_STARTED`, `ANALYSIS_COMPLETED`, `SECURITY_ANALYSIS_STARTED`, `ARCHITECTURE_ANALYSIS_STARTED`, `AI_REQUEST_STARTED`.
  - Automatic parameter scrubbing removes secrets from audit records.
- **Residual Risk**: *Low*. If database administrator credentials are compromised, audit log rows could be manually modified.

---

### 2.4 Information Disclosure (Data Leakage)
- **Threat 1: Secret Leakage in Logs or API Responses**: Hardcoded API keys found in repository code are exposed in audit logs, REST responses, or downstream LLM prompts.
- **Attack Surface**: Analysis finding APIs, AI context builder, log outputs.
- **Implemented Mitigation**:
  - Deterministic secret masking preserves a 4-character prefix and 2-character suffix with middle masked (`AKIA************1A`).
  - Plaintext secret tokens are never persisted in `secret_findings` or `audit_logs`.
- **Residual Risk**: *Low*. Unrecognized custom credential formats with irregular token syntax might evade regex detection.

- **Threat 2: Internal Stack Trace & Path Leakage**: Unhandled exceptions reveal host file paths, database schemas, or framework versions.
- **Attack Surface**: HTTP error responses across all endpoints.
- **Implemented Mitigation**:
  - RFC 7807 `ProblemDetail` handler in `GlobalExceptionHandler` strips internal stack traces and packages.
- **Residual Risk**: *Negligible*.

---

### 2.5 Denial of Service (Resource Exhaustion)
- **Threat 1: Zip Bomb / Decompression Bomb**: Specially crafted nested or expanding archives exhaust host disk or memory.
- **Attack Surface**: `POST /api/v1/repositories` upload.
- **Implemented Mitigation**:
  - Stream-level extraction counters: max archive 100MB, max uncompressed 500MB, max single file 100MB, max files 20,000, max dirs 5,000.
  - Atomic cleanup on limit breach deletes all extracted fragments immediately.
- **Residual Risk**: *Low*. Rapid succession of uploads could fill temporary disk space before quota checks trigger.

- **Threat 2: AI Token & Latency Exhaustion**: Massive repositories exhaust LLM context windows or generate enormous provider bills.
- **Attack Surface**: `POST /api/v1/repositories/{id}/ai/explain-reuse`.
- **Implemented Mitigation**:
  - `ContextBudgetManager` enforces hard caps: max 10 chunks, 16,000 characters, 4,000 tokens.
  - In-memory sliding-window rate limiter per user and per repository.
- **Residual Risk**: *Low*. Rate limiter state resets upon backend application restart.

---

### 2.6 Elevation of Privilege
- **Threat 1: Untrusted Repository Code Execution**: Ingested repository source code contains malicious scripts, build plugins, or compiled binaries that execute on the host.
- **Attack Surface**: Entire analysis pipeline.
- **Implemented Mitigation**:
  - **Absolute Non-Execution Invariant**: Repository code is treated as data, not instructions.
  - CodeMind AI never invokes compilers (`javac`), build tools (`mvn`, `gradle`, `npm`, `make`), or system shells.
  - `BinaryDetector` flags and isolates executable binaries (`.exe`, `.so`, `.class`).
- **Residual Risk**: *Low*. Zero-day parser vulnerability in `JavaParser` triggered during AST traversal.

- **Threat 2: Prompt Injection / Jailbreaking**: Malicious comments or string literals in source code instruct the LLM to ignore safety guidelines or leak instructions.
- **Attack Surface**: Downstream LLM evidence packaging.
- **Implemented Mitigation**:
  - `EvidenceSelectionService` sanitizes delimiter markers (`<SYSTEM>`, `<BEGIN_REPOSITORY_EVIDENCE>`).
  - Evidence is encapsulated within strict XML-style delimiters.
  - Immutable system prompt establishes the repository content as untrusted user data.
  - `GroundingValidator` programmatically inspects response structure and enforces security invariants.
- **Residual Risk**: *Moderate*. Advanced indirect prompt injection can occasionally manipulate LLM natural-language style, though structured JSON parsing and programmatic citation checks mitigate output tampering.
