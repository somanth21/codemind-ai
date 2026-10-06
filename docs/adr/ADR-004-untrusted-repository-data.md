# ADR-004: Treatment of Repository Content as Strictly Untrusted Data

## Status
Accepted

## Context
CodeMind AI ingests and analyzes external third-party software repositories uploaded as ZIP archives. Ingested repositories can contain arbitrarily hostile constructs:
- Directory traversal sequences (`../`, `..\`, absolute paths) designed to overwrite host operating system files.
- Nested or decompression bombs (Zip Bombs) designed to exhaust disk and memory.
- Malicious shell scripts, executable binaries, or symlinks to host system files (`/etc/passwd`, Windows registry).
- Embedded prompt injection payloads inside comments, documentation, and string literals designed to hijack downstream LLM reasoning.

## Decision
We established the architectural principle: **All repository content—including file paths, directory names, source code, comments, string literals, and metadata—must be treated as STRICTLY UNTRUSTED INPUT.**

To enforce this invariant:
1. **`PathTraversalGuard`**: Every archive entry is normalized, decoded, and verified before filesystem touch. Entries containing traversal sequences, Windows drive letters, UNC shares, symlinks, or device files are rejected.
2. **Resource Exhaustion Bounds**: Strict streaming limits are enforced during extraction: max 100MB archive, max 500MB uncompressed, max 20,000 files, max 5,000 directories. Breaches trigger atomic rollback.
3. **Physical & Logical Sandbox Isolation**: Each repository is unpacked into a physically isolated, unprivileged directory keyed by repository UUID (`sandbox/repositories/{uuid}/source`).
4. **Read-Only Inspection**: Post-ingestion analysis engines access sandbox files exclusively in read-only mode.
5. **Prompt Injection Neutralization**: When repository snippets are packaged for LLM context, delimiter tags (`<SYSTEM>`, `<BEGIN_REPOSITORY_EVIDENCE>`) are neutralized, and content is encapsulated inside explicit untrusted data markers.

## Alternatives Considered
1. **Containerized Sandbox per Repository (Docker / Podman)**:
   - Spinning up an ephemeral Docker container for each ingested repository.
   - *Rejected*: Adds heavy infrastructure requirements (Docker daemon, root privileges, container startup latency) and contradicts the zero-Docker local monolith requirement.
2. **Database Blob Storage for Repository Code**:
   - Storing all source code as byte arrays in PostgreSQL.
   - *Rejected*: Causes severe database bloat, performance degradation during AST traversal, and does not solve path traversal during upload.

## Consequences
### Positive:
- Protects the host filesystem and operating system from Zip Slip attacks and disk exhaustion.
- Enforces multi-tenant data confidentiality between disparate repositories.
- Enables lightweight, zero-virtualization execution on any standard workstation or server.

### Negative / Trade-offs:
- Legitimate archives containing symbolic links or non-standard directory structures are rejected for safety.
- Temporary sandbox disk space must be monitored and garbage-collected upon repository deletion.

## Security Implications
- Closes the primary attack surface of file upload and extraction.
- Prevents cross-tenant file snooping via directory traversal.
