# CodeMind AI — Comparative Baselines Definition

To evaluate the contributions of CodeMind AI's architecture, we define five experimental configurations ranging from standard generation-first approaches to the complete integrated pipeline.

> **Methodological Note**: This document specifies the experimental design for comparative evaluation. It deliberately does not present fabricated or unverified empirical metrics.

---

## 1. Baseline Configurations

```
[Baseline A: Zero Context Generation]
        ↓
[Baseline B: Lexical Retrieval Only]
        ↓
[Baseline C: Standard Hybrid RAG (No Reuse Scoring)]
        ↓
[Baseline D: Retrieval + Basic Reuse Scoring]
        ↓
[Proposed System: CodeMind AI Complete Pipeline]
```

---

### Baseline A: No Repository Retrieval (Zero-Context Generation)
- **Description**: Standard generative coding assistant paradigm. The user prompt is transmitted directly to the LLM without repository context or static analysis.
- **Hypothesized Weaknesses**:
  - Maximally susceptible to hallucinating non-existent repository APIs and classes.
  - Zero awareness of existing utilities, leading to 100% Unnecessary New Code Rate when reusable components exist.
  - No capability to evaluate security, maintainability, or architectural coupling.

---

### Baseline B: Lexical Repository Search Only
- **Description**: The system performs exact token / keyword matching (BM25 or tokenized symbol lookup) over file contents. Retrieved source chunks are injected into the prompt context for code generation without multi-criteria scoring or security gating.
- **Hypothesized Weaknesses**:
  - Susceptible to missing semantically equivalent components that use differing terminology (vocabulary mismatch problem).
  - No structured reuse decision policy; generation occurs regardless of candidate quality.
  - No security or architecture awareness.

---

### Baseline C: Standard Hybrid RAG (No Reuse Scoring)
- **Description**: State-of-the-art Retrieval-Augmented Generation (RAG) configuration. Combines lexical matching and dense vector embeddings (pgvector) to retrieve top-$K$ code chunks. Retrieved chunks are presented to the LLM as reference context.
- **Hypothesized Weaknesses**:
  - The LLM must decide ad-hoc whether to reuse, adapt, or rewrite without deterministic guidance.
  - Lacks deterministic quality gating: may recommend reusing components that contain high cyclomatic complexity, hardcoded secrets, or SQL injection.
  - No architectural coupling or dependency cycle analysis.

---

### Baseline D: Repository Retrieval + Basic Reuse Analysis
- **Description**: Evaluates repository candidates using functional relevance and basic structural similarity, but **disables**:
  - Security gating (vulnerabilities do not block reuse).
  - Architecture coupling and cycle analysis.
  - Downstream citation validation.
- **Hypothesized Weaknesses**:
  - May recommend direct reuse of vulnerable or architecturally entangled components.
  - Lacks provenance-backed citation enforcement in explanatory responses.

---

### Proposed System: CodeMind AI Complete Pipeline
- **Description**: The fully integrated multi-stage framework:
  1. Deterministic AST parsing and static metric extraction (JavaParser).
  2. Hybrid RRF retrieval over normalized repository chunks.
  3. Multi-criteria reuse scoring across 8 dimensions (functional, structural, maintainability, complexity, security, effort, dependency, duplication).
  4. Deterministic security gating (`CRITICAL`/`HIGH` findings force `BLOCKED` gate).
  5. Architecture intelligence (coupling metrics, cycle detection, hotspot discovery).
  6. Minimal evidence context packaging with prompt injection defenses and context budgeting.
  7. Downstream grounded LLM explanation with automated citation verification and security gate assertion.

---

## 2. Comparative Ablation Matrix

| Feature / Component | Baseline A | Baseline B | Baseline C | Baseline D | Proposed System |
|---|:---:|:---:|:---:|:---:|:---:|
| **Repository Ingestion Sandbox** | ✗ | ✓ | ✓ | ✓ | **✓** |
| **Lexical Retrieval** | ✗ | ✓ | ✓ | ✓ | **✓** |
| **Dense Vector Embeddings** | ✗ | ✗ | ✓ | ✓ | **✓** |
| **Reciprocal Rank Fusion (RRF)** | ✗ | ✗ | ✓ | ✓ | **✓** |
| **AST Symbol & Metric Extraction** | ✗ | ✗ | ✗ | ✓ | **✓** |
| **Multi-Criteria Reuse Scoring** | ✗ | ✗ | ✗ | ✓ | **✓** |
| **Deterministic Security Gating** | ✗ | ✗ | ✗ | ✗ | **✓** |
| **Package Coupling & Cycle Detection** | ✗ | ✗ | ✗ | ✗ | **✓** |
| **Prompt Injection Defense** | ✗ | ✗ | ✗ | ✗ | **✓** |
| **Context Budget Management** | ✗ | ✗ | ✗ | ✗ | **✓** |
| **Automated Citation Validation** | ✗ | ✗ | ✗ | ✗ | **✓** |
