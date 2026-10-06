# Deterministic Repository Security Analysis

CodeMind AI features a deterministic, rule-based static security analysis engine designed to inspect source code for vulnerabilities and policy violations without executing untrusted code and **without relying on non-deterministic LLMs as a security authority**.

---

## 1. Core Principles

1. **Deterministic Authority**: All security findings, vulnerability severity scores, and line provenance are derived from deterministic rules and AST pattern matching. An LLM is **never** permitted to declare code secure or invent vulnerabilities.
2. **Untrusted Code Isolation**: Repository code is treated as strictly untrusted input. Source code is parsed using static analysis engines (`JavaParser` and deterministic token scanners) in read-only sandbox mode. Code is never compiled, dynamically loaded, or executed.
3. **Sensitive Data Redaction**: Credential matches and secret values are deterministically masked (e.g., preserving a 4-character prefix and 2-character suffix with middle masked) to prevent secret leakage in logs, REST responses, or downstream LLM prompts.
4. **Multi-Tenant RBAC & IDOR Protection**: Security analyses and findings are scoped to repository ownership or auditor/admin privileges. All queries enforce `(id, repositoryId)` constraints.
5. **Direct Integration with Reuse & Grounding**:
   - In the **Reuse-First Engine (Phase 5)**: Candidates with `CRITICAL` or `HIGH` security findings are gated as `BLOCKED`. Candidates with `MEDIUM` findings are gated as `CAUTION`.
   - In the **Grounded AI Layer (Phase 6)**: Security findings provide structured, cited evidence chunks (`EvidenceType.SECURITY_FINDING`) for grounded explanations.

---

## 2. Deterministic Rule Framework

The security engine provides a pluggable rule interface:

```java
public interface SecurityRule {
    String getRuleId();
    String getName();
    SecurityCategory getCategory();
    SecuritySeverity getDefaultSeverity();
    String getCweId();
    String getDescription();
    String getRemediationAdvice();
    List<SecurityFindingEntity> scan(CompilationUnit n, String filePath, String sourceCode);
}
```

### Rule Inventory

| Rule ID | Category | Severity | CWE | Description | Deterministic Detection Strategy |
|---|---|---|---|---|---|
| `SEC-SECRET-001` | `HARDCODED_SECRET` | `CRITICAL` | CWE-798 | Hardcoded API Keys & Tokens | High-entropy regex patterns for AWS (`AKIA...`), GitHub (`ghp_...`), JWT, RSA private keys, and password assignments. Masks secret payload. |
| `SEC-CMD-001` | `COMMAND_INJECTION` | `HIGH` | CWE-78 | Native Command Execution | Identifies `Runtime.getRuntime().exec(...)` or `new ProcessBuilder(...)` where arguments involve dynamic string concatenation or variables. |
| `SEC-PATH-001` | `PATH_TRAVERSAL` | `HIGH` | CWE-22 | Arbitrary File Access / Traversal | AST search for `new File(...)`, `Paths.get(...)`, `new FileInputStream(...)` using unvalidated parameters, method parameters, or string concatenation. |
| `SEC-CRYPTO-001` | `WEAK_CRYPTO` | `MEDIUM` | CWE-327 | Broken Cryptographic Algorithms | Identifies `MessageDigest.getInstance("MD5"|"SHA-1")`, `Cipher.getInstance("DES"|"RC4"|"ECB")`, and `java.util.Random` in security contexts (keys, salts, tokens). |
| `SEC-SQL-001` | `SQL_INJECTION` | `HIGH` | CWE-89 | Dynamic SQL Query Construction | Detects `Statement.executeQuery(...)` or EntityManager native queries concatenated with non-constant string expressions. |
| `SEC-DESER-001` | `UNSAFE_DESERIALIZATION` | `CRITICAL` | CWE-502 | Insecure Object Deserialization | Detects `ObjectInputStream.readObject()`, `XMLDecoder`, or unconstrained YAML/JSON polymorphism deserialization. |
| `SEC-AUTH-001` | `MISSING_AUTH` | `MEDIUM` | CWE-306 | Unprotected Web Endpoints | Detects Spring `@RequestMapping`, `@GetMapping`, `@PostMapping` lacking `@PreAuthorize`, `@Secured`, or `@RolesAllowed` annotations. |
| `SEC-LOG-001` | `SENSITIVE_LOGGING` | `LOW` | CWE-532 | Sensitive Information in Logs | Detects logger calls (`logger.info(...)`, `log.debug(...)`) logging variables named `password`, `token`, `secret`, `ssn`, or `apiKey`. |

---

## 3. Database Schema

Migration `V6__security_and_architecture.sql` provisions:
- `security_analyses`: Run status, timestamps, KPI counters (`critical_count`, `high_count`, `medium_count`, `low_count`, `info_count`, `total_findings`), file scan counts, and duration.
- `security_findings`: Finding entries indexed by `(repository_id, security_analysis_id, severity, category)`.

---

## 4. REST API Endpoints

All endpoints require authentication and enforce repository access control (`ROLE_ADMIN`, `ROLE_AUDITOR`, or repository ownership):

- `POST /api/v1/repositories/{repositoryId}/security/analyze` — Triggers an on-demand security scan.
- `GET /api/v1/repositories/{repositoryId}/security` — Lists historical security analyses (paginated).
- `GET /api/v1/repositories/{repositoryId}/security/latest` — Retrieves the latest security analysis run.
- `GET /api/v1/repositories/{repositoryId}/security/{analysisId}` — Retrieves details of a specific security run.
- `GET /api/v1/repositories/{repositoryId}/security/{analysisId}/findings` — Retrieves findings with optional `severity` and `category` filters.
