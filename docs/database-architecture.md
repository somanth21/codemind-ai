# CodeMind AI — Database Architecture & Persistence Tier

This document specifies the persistence architecture, database schema, indexing strategies, and migration sequence of CodeMind AI.

---

## 1. Persistence Philosophy & Invariants

1. **PostgreSQL 16 + pgvector Target**:
   - Production deployments target PostgreSQL 16 with the `pgvector` extension for storing and indexing high-dimensional dense vector embeddings.
   - For standalone developer workflows and automated unit/integration test suites, the application utilizes H2 in PostgreSQL compatibility mode (`MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`).
2. **Filesystem Sandbox vs. Database Partitioning**:
   - **Source files remain strictly on the filesystem sandbox**. Raw repository source code is **never** stored as large `TEXT` or `BLOB` columns in database tables.
   - The database stores **only metadata, AST symbols, computed metrics, redacted findings, and citation evidence pointers**.
   - *Rationale*: Storing entire multi-megabyte repositories in relational tables causes database bloat, degrades backup performance, and increases attack surface. Storing source code in an unprivileged, isolated sandbox ensures atomic isolation.
3. **Derived Search Chunks**:
   - Chunk representations for retrieval and evidence citations are derived dynamically or materialized during analysis runs. They reference exact source files and line ranges (`filePath`, `startLine`, `endLine`) rather than storing duplicate source copies.
4. **Immutable Analysis Runs**:
   - Each static, reuse, security, and architecture analysis execution produces an immutable run entity (`analysis_runs`, `reuse_analyses`, `security_analyses`, `architecture_analyses`).
   - Re-running an analysis creates a new versioned run with updated timestamps, preserving historical auditability and enabling regression tracking.
5. **Multi-Tenant Scoping & Cascading Deletes**:
   - Every entity carries a foreign key to `repositories(id)`.
   - When a repository is deleted, foreign key constraints (`ON DELETE CASCADE`) automatically purge all associated metadata, symbols, metrics, and findings across all tables.

---

## 2. Migration Sequence & Table Inventory

The schema is versioned via Flyway migrations located in `backend/src/main/resources/db/migration/`:

```
V1__init_security_and_audit.sql
  ├── users
  ├── repositories
  └── audit_logs
V2__repository_ingestion_and_files.sql
  └── repository_files
V3__deterministic_static_analysis.sql
  ├── analysis_runs
  ├── symbols
  ├── relationships
  ├── file_metrics
  ├── symbol_metrics
  ├── quality_findings
  └── secret_findings
V4__reuse_analysis_engine.sql
  ├── reuse_analyses
  ├── reuse_candidates
  └── reuse_evidence
V5__ai_reasoning_requests.sql
  └── ai_reasoning_requests
V6__security_and_architecture.sql
  ├── security_analyses
  ├── security_findings
  └── architecture_analyses
```

---

## 3. Detailed Table Schema Reference

### 3.1 Core Security & Repository Management (`V1` & `V2`)
- **`users`**:
  - Columns: `id` (UUID PK), `email` (VARCHAR 255 UNIQUE), `password_hash` (VARCHAR 255), `full_name`, `role` (`ROLE_ADMIN`, `ROLE_DEVELOPER`, `ROLE_AUDITOR`), `is_active`, `created_at`, `updated_at`.
- **`repositories`**:
  - Columns: `id` (UUID PK), `name`, `storage_path`, `size_bytes`, `file_count`, `owner_id` (FK $\to$ `users`), `status` (`INGESTING`, `READY`, `ERROR`), `created_at`, `updated_at`.
- **`audit_logs`**:
  - Columns: `id` (UUID PK), `principal_email`, `event_type`, `status` (`SUCCESS`, `WARNING`, `FAILURE`), `ip_address`, `correlation_id`, `details` (TEXT), `created_at`.
  - Indexes: `idx_audit_logs_created_at`, `idx_audit_logs_event_type`, `idx_audit_logs_principal`.
- **`repository_files`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `relative_path`, `file_name`, `extension`, `language`, `size_bytes`, `line_count`, `sha256_hash`, `is_binary`, `is_symlink`, `created_at`.
  - Indexes: `idx_repo_files_repo_id`, `idx_repo_files_path`, `idx_repo_files_lang`.

---

### 3.2 Deterministic Static Analysis (`V3`)
- **`analysis_runs`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `status` (`ANALYZING`, `COMPLETED`, `FAILED`), `started_at`, `completed_at`, `files_analyzed`, `files_skipped`, `error_count`, `warning_count`, `total_loc`, `total_classes`, `total_methods`, `average_complexity`, `maintainability_index`, `created_at`.
- **`symbols`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `name`, `fqn`, `kind` (`CLASS`, `INTERFACE`, `METHOD`, `CONSTRUCTOR`, `FIELD`, `ENUM`, `RECORD`), `visibility`, `file_path`, `start_line`, `end_line`, `signature`, `doc_comment`, `created_at`.
  - Indexes: `idx_symbols_run_kind`, `idx_symbols_fqn`, `idx_symbols_repo_name`.
- **`relationships`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `source_symbol_fqn`, `target_symbol_fqn`, `type` (`EXTENDS`, `IMPLEMENTS`, `CALLS`, `HAS_FIELD`), `file_path`, `line_number`, `created_at`.
- **`file_metrics`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `file_path`, `loc`, `lloc`, `cyclomatic_complexity`, `class_count`, `method_count`, `halstead_volume`, `maintainability_index`, `created_at`.
- **`symbol_metrics`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `symbol_fqn`, `cyclomatic_complexity`, `max_nesting_depth`, `parameter_count`, `loc`, `created_at`.
- **`quality_findings`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `rule_id`, `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), `title`, `message`, `file_path`, `line_number`, `evidence`, `created_at`.
- **`secret_findings`**:
  - Columns: `id` (UUID PK), `analysis_run_id` (FK), `repository_id` (FK), `rule_id`, `secret_type`, `severity`, `file_path`, `line_number`, `redacted_evidence` (MASKED), `created_at`.

---

### 3.3 Deterministic Reuse Engine (`V4`)
- **`reuse_analyses`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `analysis_id` (FK $\to$ `analysis_runs`), `query` (TEXT), `decision` (`REUSE_DIRECTLY`, `REUSE_WITH_ADAPTATION`, `COMPOSE_EXISTING_COMPONENTS`, `EXTEND_EXISTING_COMPONENT`, `CREATE_NEW`), `overall_score`, `confidence`, `security_status` (`SAFE`, `CAUTION`, `BLOCKED`), `explanation` (TEXT), `config_version`, `created_at`.
- **`reuse_candidates`**:
  - Columns: `id` (UUID PK), `reuse_analysis_id` (FK), `symbol_id`, `file_path`, `symbol_name`, `symbol_kind`, `signature`, `start_line`, `end_line`, `candidate_type`, `overall_score`, `functional_relevance`, `structural_similarity`, `maintainability_score`, `complexity_penalty`, `security_score`, `modification_effort`, `dependency_impact`, `duplication_risk`, `security_gate` (`SAFE`, `CAUTION`, `BLOCKED`), `explanation`, `positive_signals` (JSON), `negative_signals` (JSON), `created_at`.
- **`reuse_evidence`**:
  - Columns: `id` (UUID PK), `reuse_candidate_id` (FK), `evidence_type` (`SYMBOL_DECLARATION`, `USAGE_CALLER`, `METRIC_COMPLEXITY`, `SECURITY_SCAN`), `description`, `source_file`, `start_line`, `end_line`, `metric_value`, `created_at`.

---

### 3.4 Grounded AI Reasoning (`V5`)
- **`ai_reasoning_requests`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `reuse_analysis_id` (FK, nullable), `user_id` (FK), `request_type` (`EXPLAIN_REUSE`, `EXPLAIN_EVIDENCE`), `provider` (`GEMINI`, `MOCK`), `model`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `evidence_count`, `context_chars`, `context_truncated`, `authoritative_decision`, `summary` (TEXT), `response_json` (TEXT), `created_at`.
  - Indexes: `idx_ai_req_repo`, `idx_ai_req_reuse`, `idx_ai_req_created`.

---

### 3.5 Security & Architecture Intelligence (`V6`)
- **`security_analyses`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `analysis_id` (FK $\to$ `analysis_runs`), `status`, `started_at`, `completed_at`, `critical_count`, `high_count`, `medium_count`, `low_count`, `info_count`, `total_findings`, `scanned_files_count`, `skipped_files_count`, `duration_ms`, `error_message`, `created_at`.
- **`security_findings`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `security_analysis_id` (FK), `rule_id`, `category` (`HARDCODED_SECRET`, `COMMAND_INJECTION`, `PATH_TRAVERSAL`, `WEAK_CRYPTO`, `SQL_INJECTION`, `UNSAFE_DESERIALIZATION`, `MISSING_AUTH`, `SENSITIVE_LOGGING`), `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`, `INFO`), `title`, `description`, `file_path`, `start_line`, `end_line`, `evidence_snippet` (MASKED), `remediation_advice`, `cwe_id`, `status` (`OPEN`, `REVIEWED`, `SUPPRESSED`), `created_at`.
  - Indexes: `idx_sec_findings_repo_analysis`, `idx_sec_findings_severity`, `idx_sec_findings_category`.
- **`architecture_analyses`**:
  - Columns: `id` (UUID PK), `repository_id` (FK), `analysis_id` (FK $\to$ `analysis_runs`), `status`, `started_at`, `completed_at`, `package_count`, `class_count`, `dependency_edge_count`, `cycle_count`, `hotspot_count`, `smell_count`, `average_instability`, `duration_ms`, `coupling_metrics_json` (TEXT), `cycles_json` (TEXT), `hotspots_json` (TEXT), `smells_json` (TEXT), `created_at`.
  - Indexes: `idx_arch_analyses_repo_created`.
