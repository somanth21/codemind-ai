# CodeMind AI — Deterministic Static Analysis Engine (Phase 3)

## 1. Overview & Architectural Philosophy

The deterministic static analysis engine serves as the empirical ground truth for CodeMind AI. In contrast to heuristic or probabilistic LLM evaluations, CodeMind computes all architectural symbols, structural relationships, software complexity metrics, and quality defects **deterministically** directly from source ASTs and source text.

### Core Architectural Principle
> **LLMs must NOT be used to calculate deterministic software metrics or extract AST symbols.**
> 
> Relying on generative models for numerical metrics (e.g. McCabe cyclomatic complexity, lines of code, nesting depth, Halstead volume) introduces hallucinations, non-reproducible measurements, token costs, and high latency. CodeMind enforces deterministic parsing (via JavaParser) as the foundational layer upon which future semantic search (Phase 4) and intelligent assistants (Phase 5+) depend.

---

## 2. AST Extraction Model

### JavaParser Integration
CodeMind utilizes `com.github.javaparser:javaparser-core:3.26.1` configured at language level `JAVA_17` with comment preservation enabled. Parsing is sandboxed and fail-safe:
- Sandboxed file access: Files are loaded only from the repository's isolated sandbox directory (`codemind-sandbox/repositories/<id>/source/`).
- Failure isolation: Malformed syntax in any file is captured as a `SYNTAX_ERROR` finding and tracked via `errorCount` without aborting the overall analysis run.

### Extracted Symbol Hierarchy
Every symbol entity records full provenance: `id`, `repositoryId`, `analysisId`, `filePath`, `startLine`, `endLine`, `visibility`, `modifiers`, `signature`, and parent-child hierarchy:

1. **`PACKAGE`**: Canonical package identifier (e.g., `com.codemind.analyzer`).
2. **`CLASS`**: Standard class declarations, including nested and inner classes.
3. **`INTERFACE`**: Interface declarations and their abstract member contracts.
4. **`ENUM`**: Enumeration types.
5. **`RECORD`**: Java 16+ immutable record types.
6. **`CONSTRUCTOR`**: Class constructors with parameter types, signature, and access modifiers.
7. **`METHOD`**: Static, instance, and abstract methods with parameter signatures and return types.
8. **`FIELD`**: Class and instance fields with type and visibility.

---

## 3. Relationship Extraction Model

Relationships model structural coupling across compilation units:

| Type | Description | Confidence |
| :--- | :--- | :--- |
| `EXTENDS` | Class/interface inheritance hierarchy | `RESOLVED` / `PARTIAL` |
| `IMPLEMENTS` | Interface contract implementations | `RESOLVED` / `PARTIAL` |
| `CALLS` | Method invocations (`MethodCallExpr`) | `RESOLVED` (same package/import) or `PARTIAL` |
| `CREATES` | Instantiations (`new Foo()`) | `RESOLVED` or `PARTIAL` |
| `FIELD_ACCESS` | Field references and dereferences | `RESOLVED` or `PARTIAL` |

Confidence tracking:
- `RESOLVED`: Fully qualified target class and member identified via import table or same package.
- `PARTIAL`: Method/field name identified on receiver variable whose exact type cannot be statically resolved without full classpath symbol resolution.
- `UNRESOLVED`: Complex dynamic or chained expressions.

---

## 4. Software Metrics & Mathematical Formulations

### 1. Physical Lines of Code (LOC)
The count of all newline-delimited lines in the file:
$$\text{LOC} = \text{line\_count}(\text{source})$$

### 2. Logical Lines of Code (LLOC)
Non-blank, non-comment lines containing executable statements or declarations. Single-line (`//`) and multi-line (`/* ... */`) comment blocks are filtered out.

### 3. McCabe Cyclomatic Complexity ($CC$)
Derived from control flow graphs. Each method begins with a baseline complexity of 1, incrementing by 1 for each independent decision path:
$$CC = 1 + \sum (\text{decision points})$$
Decision points include:
- `if` statements
- `for` and `forEach` loops
- `while` and `do-while` loops
- Each `case` entry in `switch` statements (excluding `default`)
- `catch` clauses
- Ternary conditional operators (`? :`)
- Boolean logical operators (`&&`, `||`)

### 4. Nesting Depth
Maximum control flow nesting depth within method and constructor blocks, tracking nested branching and looping constructs (`if`, `for`, `while`, `switch`, `try-catch`, `synchronized`).

### 5. Halstead Software Science Metrics
Halstead metrics evaluate structural vocabulary and information volume:
- $\eta_1$: Number of distinct operators
- $N_1$: Total number of operators
- $\eta_2$: Number of distinct operands
- $N_2$: Total number of operands
- **Program Vocabulary ($n$)**: $n = \eta_1 + \eta_2$
- **Program Length ($N$)**: $N = N_1 + N_2$
- **Program Volume ($V$)**: $V = N \cdot \log_2(n)$ (where $n > 0$, else $0.0$)
- **Difficulty ($D$)**: $D = \left(\frac{\eta_1}{2}\right) \cdot \left(\frac{N_2}{\eta_2}\right)$ (where $\eta_2 > 0$, else $0.0$)
- **Effort ($E$)**: $E = D \cdot V$

### 6. Maintainability Index ($MI$)
Computed using the standard Carnegie Mellon / SEI formula normalized to a $0 \text{--} 100$ scale:
$$MI_{\text{raw}} = 171 - 5.2 \cdot \ln(\max(1, V)) - 0.23 \cdot CC - 16.2 \cdot \ln(\max(1, LOC))$$
$$MI = \max\left(0, \min\left(100, \frac{MI_{\text{raw}} \cdot 100}{171}\right)\right)$$

---

## 5. Quality Rules & Configurable Thresholds

| Rule ID | Severity | Threshold | Description |
| :--- | :--- | :--- | :--- |
| `HIGH_CYCLOMATIC_COMPLEXITY` | `MEDIUM` / `CRITICAL` | $CC > 10$ (`MEDIUM`), $CC > 20$ (`CRITICAL`) | High branch complexity hinders testing and maintainability |
| `EXCESSIVE_NESTING_DEPTH` | `MEDIUM` | $\text{Depth} > 4$ | Deeply nested blocks hinder code readability |
| `TOO_MANY_PARAMETERS` | `MEDIUM` | $\text{Params} > 5$ | Methods with high parameter counts violate clean code principles |
| `LONG_METHOD` | `LOW` / `MEDIUM` | $\text{LOC} > 50$ (`LOW`), $\text{LOC} > 100$ (`MEDIUM`) | Bloated method bodies |
| `LARGE_CLASS` | `MEDIUM` / `HIGH` | $\text{LOC} > 500$ (`MEDIUM`), $\text{LOC} > 1000$ (`HIGH`) | Class violates Single Responsibility Principle |
| `EMPTY_CATCH_BLOCK` | `HIGH` | 0 statements in `catch` block | Exception swallowed silently, concealing production bugs |
| `TODO_FIXME_MARKER` | `INFO` | Comment matching `TODO` or `FIXME` | Unresolved technical debt in source comments |
| `SYNTAX_ERROR` | `HIGH` | Malformed compilation unit | Unparseable or corrupt Java source file |

---

## 6. Secret Scanner & Strict Redaction

To prevent repository data exfiltration and credential leaks, all ingested files are scanned across high-confidence credential regex patterns:

1. **`PRIVATE_KEY`**: OpenSSH, RSA, EC, DSA private key headers (`CRITICAL`).
2. **`AWS_ACCESS_KEY`**: AWS Access Key identifiers `AKIA[0-9A-Z]{16}` (`CRITICAL`).
3. **`GITHUB_TOKEN`**: Personal access tokens `ghp_*` and `github_pat_*` (`CRITICAL`).
4. **`SLACK_TOKEN`**: Bot and user tokens `xox[baprs]-*` (`HIGH`).
5. **`JWT_TOKEN`**: Standard JSON Web Tokens `ey...` (`HIGH`).
6. **`GENERIC_API_KEY`**: API key variable assignments (`HIGH`).

### Strict Redaction Guarantee
Plaintext secrets are **NEVER** stored in the database, returned in REST payloads, or printed in application logs. Evidence is strictly masked prior to persistence:
- e.g., `AKIA1234567890ABCDEF` $\rightarrow$ `AKIA**************EF`
- Private key blocks $\rightarrow$ `-----BEGIN [REDACTED PRIVATE KEY]-----`

---

## 7. Known Limitations & Research Roadmap
- **Inter-procedural Type Resolution**: Static analysis is currently based on syntax trees (AST) and import tables without full bytecode symbol solving. External third-party dependencies not bundled in the sandbox cannot have their complete inheritance graphs resolved.
- **Language Scope**: Deep AST extraction is currently focused on Java (`.java`). Non-Java files receive physical/logical line metrics and secret scanning. Phase 4 and Phase 5 will introduce polyglot Tree-sitter parsers.
