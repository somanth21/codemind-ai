# CodeMind AI — REST API Contract (Phase 11 Specification)

**Document Version**: 1.0.0  
**Base URL**: `/api/v1`  
**Security Standard**: RFC 7807 Problem Details, Stateless JWT (`Bearer`)  
**Status**: ACTIVE & VERIFIED  

---

## 1. Authentication & Identity Endpoints

### 1.1 User Login
- **Method**: `POST`
- **Path**: `/api/v1/auth/login`
- **Status**: `IMPLEMENTED`
- **Authentication Required**: `No` (Public)
- **Authorized Roles**: `ALL`
- **Request Body**:
  ```json
  {
    "email": "developer@codemind.ai",
    "password": "DevSecure123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "developer@codemind.ai",
      "role": "ROLE_DEVELOPER",
      "createdAt": "2026-10-06T12:00:00Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request` — Validation failure on email or password.
  - `401 Unauthorized` — Invalid credentials.

### 1.2 Current User Inspection
- **Method**: `GET`
- **Path**: `/api/v1/auth/me`
- **Status**: `IMPLEMENTED`
- **Authentication Required**: `Yes`
- **Authorized Roles**: `ALL` (Authenticated)
- **Response** (`200 OK`): `UserDto` (same as user object above).
- **Error Responses**: `401 Unauthorized`.

---

## 2. Repository Ingestion & File Tree Endpoints

### 2.1 Ingest Repository Archive
- **Method**: `POST`
- **Path**: `/api/v1/repositories`
- **Status**: `IMPLEMENTED`
- **Content-Type**: `multipart/form-data`
- **Authentication Required**: `Yes`
- **Authorized Roles**: `ROLE_ADMIN`, `ROLE_DEVELOPER`
- **Parameters**: `file` (Multipart ZIP archive), `name` (Optional String).
- **Response** (`201 Created`): `RepositoryDetailResponse` (UUID, name, file count, total bytes, SHA-256 checksum).
- **Error Responses**:
  - `400 Bad Request` — Invalid or corrupted archive, ZIP path traversal attempt.
  - `413 Payload Too Large` — File exceeds maximum allowed archive size.

### 2.2 List Ingested Repositories
- **Method**: `GET`
- **Path**: `/api/v1/repositories`
- **Status**: `IMPLEMENTED`
- **Authentication Required**: `Yes`
- **Response** (`200 OK`): `List<RepositorySummaryResponse>`.

### 2.3 Get Repository Details
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{id}`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `RepositoryDetailResponse`.
- **Error Responses**: `404 Not Found` (if repository does not exist or belongs to another tenant).

### 2.4 Delete Repository
- **Method**: `DELETE`
- **Path**: `/api/v1/repositories/{id}`
- **Status**: `IMPLEMENTED`
- **Response** (`204 No Content`).

### 2.5 Get Repository Directory Tree
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{id}/tree`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `RepositoryTreeNodeDto` (Recursive hierarchy of folders and files).

### 2.6 List Repository Files (Paginated)
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{id}/files`
- **Status**: `IMPLEMENTED`
- **Query Parameters**: `language`, `extension`, `binary`, `pathPrefix`, `page`, `size`, `sort`.
- **Response** (`200 OK`): `Page<RepositoryFileResponse>`.

### 2.7 Read File Content
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{id}/files/content`
- **Status**: `IMPLEMENTED`
- **Query Parameters**: `path` (Required relative file path).
- **Response** (`200 OK`): `FileContentResponse` (`path`, `content`, `lengthBytes`).

---

## 3. Deterministic AST Analysis & Metric Endpoints

### 3.1 Trigger Deterministic Analysis
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/analyze`
- **Status**: `IMPLEMENTED`
- **Response** (`201 Created`): `AnalysisRunResponse`.

### 3.2 List Analysis Runs
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<AnalysisRunResponse>`.

### 3.3 Get Analysis Run Summary
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `AnalysisRunResponse`.

### 3.4 Get Extracted Symbols
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}/symbols`
- **Status**: `IMPLEMENTED`
- **Query Parameters**: `kind` (CLASS, METHOD, INTERFACE, etc.), `page`, `size`.
- **Response** (`200 OK`): `Page<SymbolResponse>`.

### 3.5 Get AST Relationships
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}/relationships`
- **Status**: `IMPLEMENTED`
- **Query Parameters**: `type` (CALLS, EXTENDS, IMPLEMENTS, IMPORTS), `page`, `size`.
- **Response** (`200 OK`): `Page<RelationshipResponse>`.

### 3.6 Get File Metrics (Complexity & Maintainability)
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}/metrics`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<FileMetricsResponse>` (LOC, Cyclomatic Complexity, Cognitive Complexity, MI).

### 3.7 Get Quality Findings
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}/findings`
- **Status**: `IMPLEMENTED`
- **Query Parameters**: `severity`, `ruleId`, `page`, `size`.
- **Response** (`200 OK`): `Page<QualityFindingResponse>`.

### 3.8 Get Secret Findings
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/analyses/{analysisId}/secrets`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<SecretFindingResponse>`.

---

## 4. Deterministic Reuse-First Engine Endpoints

### 4.1 Trigger Multi-Criteria Reuse Evaluation
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/reuse/analyze`
- **Status**: `IMPLEMENTED`
- **Request Body**:
  ```json
  {
    "query": "string utility token split",
    "limit": 10
  }
  ```
- **Response** (`201 Created`): `ReuseAnalysisResponse` (Overall decision, 8-dimensional candidate scores, hard security gate status, cited evidence).

### 4.2 List Reuse Analyses
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/reuse`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<ReuseAnalysisResponse>`.

### 4.3 Get Reuse Analysis Detail
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/reuse/{analysisId}`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `ReuseAnalysisResponse`.

### 4.4 Get Reuse Candidates for Analysis
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/reuse/{analysisId}/candidates`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `List<ReuseCandidateResponse>`.

---

## 5. Deterministic Security Rule Endpoints

### 5.1 Trigger Deterministic Security Scan
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/security/analyze`
- **Status**: `IMPLEMENTED`
- **Request Body**: `{"analysisId": "..."}` (Optional).
- **Response** (`201 Created`): `SecurityAnalysisResponse`.

### 5.2 List Security Analysis Runs
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/security`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<SecurityAnalysisResponse>`.

---

## 6. Deterministic Architecture Intelligence Endpoints

### 6.1 Trigger Architecture Analysis
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/architecture/analyze`
- **Status**: `IMPLEMENTED`
- **Request Body**: `{"analysisId": "..."}` (Optional).
- **Response** (`201 Created`): `ArchitectureAnalysisResponse` (Tarjan dependency cycles, Martin coupling metrics $A, I, D$, design smells).

### 6.2 List Architecture Analysis Runs
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/architecture`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<ArchitectureAnalysisResponse>`.

---

## 7. Grounded AI Reasoning Layer Endpoints

### 7.1 Explain Reuse Recommendation
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/ai/explain-reuse`
- **Status**: `IMPLEMENTED`
- **Request Body**:
  ```json
  {
    "reuseAnalysisId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "query": "Can we adapt this class for pagination?",
    "promptStyle": "CONCISE"
  }
  ```
- **Response** (`200 OK`): `AiReasoningDto` (Synthesized explanation, cited evidence IDs, security invariant validation badge, token usage metrics).

### 7.2 Explain Repository Evidence
- **Method**: `POST`
- **Path**: `/api/v1/repositories/{repositoryId}/ai/explain-evidence`
- **Status**: `IMPLEMENTED`
- **Request Body**:
  ```json
  {
    "query": "How is authentication configured?",
    "limit": 8
  }
  ```
- **Response** (`200 OK`): `AiReasoningDto`.

### 7.3 List AI Reasoning History
- **Method**: `GET`
- **Path**: `/api/v1/repositories/{repositoryId}/ai/history`
- **Status**: `IMPLEMENTED`
- **Response** (`200 OK`): `Page<AiReasoningDto>`.

---

## 8. System Health Probing

### 8.1 Health Status
- **Method**: `GET`
- **Path**: `/api/v1/health`
- **Status**: `IMPLEMENTED`
- **Authentication Required**: `No` (Public)
- **Response** (`200 OK`): `{"status": "UP", "timestamp": "...", "database": "CONNECTED"}`.
