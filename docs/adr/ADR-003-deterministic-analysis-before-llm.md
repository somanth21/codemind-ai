# ADR-003: Deterministic Static Analysis Before Probabilistic LLM Reasoning

## Status
Accepted

## Context
A central architectural challenge in AI-assisted software engineering is the reliability and authority of repository information. Conventional generative coding assistants frequently query LLMs directly to assess code complexity, evaluate security vulnerabilities, or understand call graphs.

However, LLMs are probabilistic models prone to hallucination, non-determinism, mathematical inconsistency in calculating software engineering metrics, and vulnerability to prompt injection attacks embedded in source code.

## Decision
We established a strict architectural invariant: **Deterministic static analysis is the authoritative source of truth, and LLM reasoning operates strictly downstream as an explanatory interpreter.**

Under this decision:
1. **Zero LLM Metric Calculation**: McCabe cyclomatic complexity, Halstead metrics, Maintainability Indexes, AST symbol declarations, and package coupling ($C_a, C_e, I$) must be calculated mathematically via deterministic algorithms (e.g., `JavaParser`, DFS cycle detection).
2. **Zero LLM Security Authority**: Security findings and vulnerability ratings must originate from deterministic rules. An LLM is strictly prohibited from declaring code secure or inventing vulnerabilities.
3. **Downstream Explanatory Role**: The LLM receives pre-computed deterministic evidence and produces cited explanations over that evidence.

## Alternatives Considered
1. **LLM-First Repository Understanding**:
   - Transmitting raw code files to the LLM and asking it to output metrics, find bugs, and recommend architectures.
   - *Rejected*: Incurred catastrophic hallucination rates, inconsistent metric scores across identical runs, massive token costs, and high vulnerability to indirect prompt injections.
2. **Hybrid Authority (LLM Voting with Static Analysis)**:
   - Allowing the LLM to override or vote on static metrics and security gates.
   - *Rejected*: Violated the research requirement for verifiable, mathematically reproducible software engineering evaluations.

## Consequences
### Positive:
- **Reproducibility & Auditability**: Static metrics and security findings are 100% deterministic and reproducible across multiple runs on identical codebases.
- **Cost & Latency Reduction**: Eliminates costly LLM invocations for structural extraction, symbol mapping, and metric computation.
- **Zero Hallucination of Metrics**: Cyclomatic complexity and lines of code reflect exact mathematical reality.

### Negative / Trade-offs:
- Static analysis engine requires dedicated implementation and maintenance for each supported programming language.
- Pure static analysis cannot evaluate dynamic runtime behaviors (e.g., reflection, dynamic dependency injection).

## Security Implications
- Prevents adversarial source code comments from manipulating structural metrics or bypassing security evaluations.
- Guarantees that security gating decisions cannot be swayed or hallucinated away by an LLM.
