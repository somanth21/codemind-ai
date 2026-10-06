# GitHub Repository Ingestion Architecture & Security Specification

**Document Version**: 1.0.0  
**Phase**: Phase 11A.2 Ingestion Engine  
**Classification**: Secure Public Ingestion Architecture  

---

## 1. Objective & Scope

CodeMind AI introduces **direct public GitHub repository ingestion** as the primary onboarding action for developers, providing instant repository-aware intelligence without requiring manual ZIP downloads or local file preparation.

### Scope Boundaries:
- **Public Repositories**: Supported via HTTPS streaming (`https://github.com/{owner}/{repo}`).
- **Private Repositories**: Deferred to future OAuth 2.0 application tokens; unauthenticated private attempts are gracefully rejected without disclosing system details.
- **Strict Prohibition**: Under no circumstances does CodeMind invoke `Runtime.getRuntime().exec("git clone ...")` or process shell arguments. Ingestion uses safe HTTP archive streaming.

---

## 2. SSRF Protection & URL Validation (`GitHubUrlValidator`)

To prevent Server-Side Request Forgery (SSRF) and metadata service exploitation (e.g. AWS `169.254.169.254`), all GitHub repository connection requests pass through a strict validator before any network socket is opened.

### Validation Rules:
1. **Scheme Enforcement**: Protocol must strictly be `https`. `http://`, `file://`, `ftp://`, or custom schemes are rejected immediately.
2. **Host Whitelist**: Hostname must be strictly `github.com` or `www.github.com`. IP addresses (IPv4, IPv6, hex-encoded, integer format) and `localhost`/`127.0.0.1` are rejected.
3. **No Embedded Credentials**: URLs with `user:password@host` are forbidden to prevent credential harvesting.
4. **Port Restrictions**: Only default HTTPS (port 443) is permitted; custom ports are rejected.
5. **Regex Coordinates**: URL path must match `^https://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?:/)?(?:\\.git)?$`. Path traversal tokens (`..`) in owner, repo, or branch names trigger immediate validation errors.

---

## 3. Streaming Ingestion Pipeline (`GitHubIngestionService`)

Instead of buffering entire repositories in system memory or shelling out to Git binaries:

1. **HTTP Streaming**: Direct connection to `https://codeload.github.com/{owner}/{repo}/zip/refs/heads/{branch}` with manual redirect inspection.
2. **Redirect Validation**: Follows maximum 3 HTTP redirects, re-verifying that each redirect target remains on approved GitHub hosts (`github.com`, `codeload.github.com`).
3. **Timeouts**: Strict 15-second connect timeout and 30-second read timeout.
4. **Bounded Stream Guard**: Enforces `properties.getMaxArchiveSizeBytes()` (default 50MB) on every byte read from the stream to prevent gzip/zip archive denial-of-service.
5. **Phase 2 Sandbox Re-use**: The raw stream passes directly into the existing `ZipExtractionService` and `FileMetadataScanner`, inheriting all Phase 2 defenses:
   - Path traversal prevention.
   - Symlink/hardlink rejection.
   - Quota limits on file counts and extracted disk usage.
   - Guaranteed atomic directory rollback on failure.

---

## 4. REST API Contract

```http
POST /api/v1/repositories/github
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "url": "https://github.com/spring-projects/spring-petclinic",
  "branch": "main"
}
```

### Response:
```json
{
  "id": "e1965e8b-55a0-41cd-a6b6-202f1cf092c6",
  "name": "spring-projects/spring-petclinic",
  "sourceType": "GITHUB",
  "status": "READY",
  "fileCount": 48,
  "totalSizeBytes": 194850,
  "createdAt": "2026-10-07T04:00:30.500Z",
  "ingestionCompletedAt": "2026-10-07T04:00:32.100Z",
  "failureReason": null,
  "ownerId": "...",
  "ownerEmail": "developer@codemind.ai"
}
```

---

## 5. Security Invariant Matrix

| Vector | Defense Mechanism | Verified By |
| :--- | :--- | :--- |
| **SSRF** | Host whitelist (`github.com`), IP block, HTTPS check | `GitHubUrlValidatorTest` |
| **Command Injection** | Zero shell execution; direct Java HTTP streaming | Architecture invariant |
| **Memory Exhaustion** | `BoundedInputStream` byte-level quota | `GitHubIngestionService` |
| **Archive Traversal** | Path canonicalization before file creation | `ZipExtractionService` |
| **Multi-Tenant Leakage** | Repository ownership mapped to authenticated principal | `RepositoryIngestionSecurityTest` |
| **Auditor Mutation** | RBAC check forbidding auditor role from ingestion | `RepositoryIngestionSecurityTest` |
