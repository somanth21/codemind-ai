# CodeMind AI — System Limitations & Constraints

To maintain scientific integrity and realistic expectations, this document explicitly details the known technical, architectural, and empirical limitations of CodeMind AI across its current implementation.

---

## 1. Static Analysis & Language Support Limitations

1. **Java-Centric Deep AST Analysis**:
   - Deep Abstract Syntax Tree parsing, McCabe cyclomatic complexity calculation, Halstead metric calculation, and object-oriented call relationship extraction are implemented for **Java** using `JavaParser`.
   - Other languages (e.g., Python, TypeScript, Go) currently receive basic metadata, token chunking, and language classification, but lack deep semantic AST parsing in the current version.
2. **Partial Call Graph & Relationship Incompleteness**:
   - The deterministic relationship extractor resolves direct static relationships (`EXTENDS`, `IMPLEMENTS`, `CALLS`, `HAS_FIELD`).
   - Dynamic polymorphism, reflection (`Class.forName`, `Method.invoke`), dynamic proxies, dependency injection frameworks (runtime Spring container bindings), and complex functional interfaces may not be fully resolved statically without runtime evaluation.
3. **Static Analysis Does Not Prove Runtime Exploitability**:
   - Static security rules identify vulnerable code patterns and anti-patterns (e.g., raw SQL concatenation, command invocation, hardcoded credentials).
   - A static finding does not prove that an execution path is reachable or exploitable under runtime security controls (e.g., behind strict upstream WAFs or internal parameter sanitizers).
4. **Heuristic Nature of Certain Security Rules**:
   - Certain rules (e.g., sensitive logging detection, weak random context detection) rely on variable name patterns and identifier naming heuristics.
   - Non-standard naming or obfuscated code may evade heuristic detection or generate false positive alerts.

---

## 2. Architecture & Search Limitations

1. **Architectural Inference Boundaries**:
   - Package coupling ($C_a, C_e, I$) and dependency cycle detection depend strictly upon statically visible package declarations and imports.
   - External dependencies (third-party Maven artifacts) are treated as boundary leaves and do not have internal cycles resolved.
2. **Embedding Model Dependency**:
   - While lexical retrieval operates standalone, semantic vector search requires a valid embedding service or pgvector store. When running in zero-dependency in-memory dev mode without embeddings, the system falls back to lexical symbol search.

---

## 3. AI Reasoning & Citation Limitations

1. **Citation Validity vs. Factual Correctness**:
   - The `GroundingValidator` programmatically confirms that every citation `[E#]` in the response was present in the prompt context and corresponds to genuine repository evidence.
   - **Crucial Limitation**: Citation validity does **not** mathematically prove that the natural language explanation written by the LLM is factually, syntactically, or semantically accurate. An LLM can cite a valid evidence chunk while asserting a flawed deduction.
2. **Residual Hallucination Risk**:
   - Despite low temperature ($T=0.0$), strict JSON schemas, and delimiter defenses, LLMs remain probabilistic language models. They may still misinterpret nuances of codebase semantics.
3. **Context Budget Bounds**:
   - To prevent context overflow and reduce latency, context is bounded (max 10 chunks, 16,000 characters, 4,000 tokens). Repositories with highly dispersed, large-scale cross-package interactions may experience evidence truncation.

---

## 4. Operational & Execution Boundaries

1. **Non-Execution Security Invariant**:
   - By fundamental design, CodeMind AI **never compiles, links, or executes repository code**, and never invokes build tools (`mvn`, `gradle`, `npm`, `make`).
   - Consequently, the system cannot verify whether code compiles without errors or whether unit tests pass.
2. **Zero Autonomous Code Modification**:
   - CodeMind AI is an analytical and advisory assistant. It does not automatically edit files on disk, submit pull requests, or alter repository branches.
3. **No Shell or Tool Execution**:
   - The backend runs in an unprivileged process with no capabilities to invoke arbitrary host operating system commands on behalf of repository code.
4. **No IDE Extension in Core System**:
   - Integration with editor extensions (such as the planned "Ponytail" VS Code plugin) is intentionally out of scope for the core platform and is not implemented in the current system.
