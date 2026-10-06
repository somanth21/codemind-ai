# ADR-005: Deterministic Reuse-First Decision Engine

## Status
Accepted

## Context
Standard generative coding assistants respond to feature or refactoring requests by immediately generating newly synthesized code. This leads to code duplication, increased cyclomatic complexity, inconsistent security patterns, and software architecture erosion.

To explore an alternative paradigm, CodeMind AI required a mechanism to assess whether existing repository assets (methods, classes, utility modules) can satisfy or assist the user's intent *before* new code creation is considered.

## Decision
We implemented a **Deterministic Reuse-First Decision Engine** that executes multi-criteria candidate evaluation and policy gating prior to any downstream generation.

Key structural decisions:
1. **8-Dimensional Evaluation**: Candidate components are scored across:
   - Functional Relevance ($w=0.30$)
   - Structural Similarity ($w=0.20$)
   - Maintainability Score ($w=0.15$)
   - Complexity Penalty ($w=0.15$)
   - Security Audit Score ($w=0.15$)
   - Duplication Risk ($w=0.10$)
   - Modification Effort ($w=0.10$)
   - Dependency Impact ($w=0.10$)
2. **Deterministic Security Gate**: If a candidate component contains `CRITICAL` or `HIGH` static security findings (e.g., hardcoded credentials, SQL injection, command execution), the security gate marks the candidate `BLOCKED`. A `BLOCKED` candidate cannot receive a `REUSE_DIRECTLY` recommendation.
3. **Structured Policy Decision**: Maps scores and gate statuses into explicit strategies: `REUSE_DIRECTLY`, `REUSE_WITH_ADAPTATION`, `COMPOSE_EXISTING_COMPONENTS`, `EXTEND_EXISTING_COMPONENT`, or `CREATE_NEW`.

## Alternatives Considered
1. **LLM-Based Reuse Evaluation**:
   - Asking the LLM to inspect retrieved code and decide whether to reuse it.
   - *Rejected*: Inconsistent scoring, lack of calibrated thresholds, and failure to deterministically block known vulnerable components.
2. **Simple Lexical Thresholding**:
   - Reusing if token similarity $> 80\%$.
   - *Rejected*: Ignores structural signature compatibility, maintainability degradation, and security vulnerabilities.

## Consequences
### Positive:
- **Reduces Code Duplication**: Actively encourages utilizing existing repository capabilities.
- **Architectural Safety**: Blocks direct reuse of high-complexity or insecure components.
- **Verifiable Provenance**: Generates human-readable trade-off explanations with exact line numbers and metrics.

### Negative / Trade-offs:
- Requires tuning of scoring weights and decision thresholds across diverse project types.
- Candidate discovery depends on the quality of AST symbol extraction and hybrid retrieval.

## Security Implications
- Directly connects static security findings into feature recommendations, preventing automated propagation of known repository vulnerabilities.
