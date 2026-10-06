# CodeMind AI — Security Threat Model (Phase 2 Ingestion)

This document specifies the threat model and defensive architecture governing repository ingestion and sandbox isolation in CodeMind AI.

---

## 1. Trust Boundaries & Principles
1. **Hostile Input Assumption**: Any file, archive, path name, or metadata supplied by an ingested repository is treated as **untrusted, potentially hostile input**.
2. **Zero Code Execution**: CodeMind AI is an analytical assistant, **never a build environment or runtime sandbox**. It **never executes repository code, never invokes compiler scripts (`make`, `mvn`, `gradle`, `npm`), and never triggers shell commands found in uploaded code**.
3. **Strict Isolation**: Repository $A$ is physically and logically partitioned from Repository $B$. Under no circumstances may an archive read, modify, or infer data from another tenant or escape its sandbox boundary.

---

## 2. Ingestion Threat Matrix

| Asset | Threat | Mitigation | Residual Risk |
|---|---|---|---|
| **Host Filesystem** | **Zip Slip / Path Traversal Attack**<br>Archive contains entries with `../`, `..\`, absolute paths (`/etc/passwd`), Windows drive letters (`C:\`), or UNC paths (`\\server\share`) designed to overwrite system files. | **`PathTraversalGuard`**: Every entry path is decoded, normalized, and validated. Must satisfy `resolvedPath.startsWith(sandboxRoot)`. Leading slashes, Windows drive letters, UNC prefixes, and traversal patterns are strictly rejected before filesystem touch. | Low. Path verification is performed using canonical `java.nio.file.Path` abstractions before writing. |
| **Host Storage & Memory** | **Zip Bomb / Resource Exhaustion**<br>Specially crafted archives (recursive zips, gigabytes of zeroes) that expand uncontrollably, crashing the server with out-of-disk or out-of-memory errors. | **`ZipExtractionService`**: Strict configurable limits enforced on every byte streamed: Max archive size (100MB), max extracted size (500MB), max single file (100MB), max file count (20,000), max directories (5,000). Atomic rollback cleans up immediately upon limit breach. | Low. Limits are checked continuously during stream processing rather than post-extraction. |
| **Host System & OS Boundaries** | **Symlink & Special File Manipulation**<br>Archive contains symbolic links pointing to `/etc`, host root, or Windows device nodes (`CON`, `PRN`, `NUL`). | **`PathTraversalGuard` & Symlink Prohibition**: Symlinks, hardlinks, named pipes, and device files are forbidden. Only regular files and directories are unpacked. Filesystem checks verify `!Files.isSymbolicLink(path)`. | Low. No symlink creation occurs during extraction. |
| **Repository Integrity** | **Ambiguous Entry Collisions & Overwrites**<br>Archive contains conflicting entries (e.g. file and directory sharing the same name or duplicate file paths) to bypass filters. | **Deterministic Duplicate & Collision Tracking**: Canonical relative paths are tracked in an active extraction set. Any duplicate entry or directory/file collision triggers immediate failure and full cleanup. | Negligible. |
| **Data Privacy & Multi-Tenancy** | **Cross-Tenant Repository Snooping**<br>User $B$ crafts HTTP requests using User $A$'s repository UUID to read code or tree structure. | **Server-Side RBAC Enforcement**: `RepositoryIngestionService` validates that `repo.owner.id == requester.id` unless requester possesses `ROLE_ADMIN`. Unauthorized queries trigger audit warnings and return 403 Forbidden. | Negligible. |
| **Server Operations & API Clients** | **Stack Trace & Internal Path Leakage**<br>Exceptions disclose internal server paths, database credentials, or framework internals to API consumers. | **RFC 7807 `ProblemDetail` Sanitization**: `GlobalExceptionHandler` intercepts all runtime errors, strips internal exceptions and stack traces, and returns sanitized ProblemDetail with request correlation IDs. | Negligible. |
| **Executable Malware Storage** | **Accidental Binary Execution**<br>Malicious executables disguised with source extensions (`.java`, `.py`) uploaded to compromise host. | **`BinaryDetector` & Non-Execution**: Scans initial byte buffers for NUL bytes (`0x00`) and high non-printable byte density. Flagged binary files are locked from plain-text rendering and excluded from analytical pipelines. | Negligible (files are never executed). |

---

## 3. Defense-in-Depth Invariants

```
Untrusted ZIP Archive
        │
        ▼
[Spring Multipart Guard] ──► Enforces 100MB HTTP payload ceiling
        │
        ▼
[PathTraversalGuard] ────► Validates every entry name before disk touch:
                             • No '../' or '..\'
                             • No '%2e%2e%2f' encoding
                             • No '/root' or 'C:\' or '\\unc'
                             • Path length ≤ 500 chars, Filename ≤ 255 chars
        │
        ▼
[ZipExtractionService] ──► Streams to isolated repository sandbox:
                             • Single file ≤ 100MB
                             • Total uncompressed ≤ 500MB
                             • Total files ≤ 20,000
                             • Total dirs ≤ 5,000
                             • Collision & duplicate check
                             • On ANY failure: Atomic safeDeleteRecursively()
        │
        ▼
[FileMetadataScanner] ──► Read-only inspection of regular files:
                             • Deterministic Language Classification
                             • NUL-byte & Control-byte Binary Detection
                             • SHA-256 fingerprinting
                             • Stores metadata ONLY (source code not in DB)
        │
        ▼
[Security Audit Log] ───► Logs REPO_REGISTERED, INGESTION_COMPLETED/FAILED
                             (Sanitizes all sensitive details)
```
