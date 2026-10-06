# ADR-006: Grounded AI Reasoning Layer and Programmatic Citation Validation

## Status
Accepted

## Context
When developers query AI assistants about repository recommendations, explanations that lack specific citations are difficult to verify, prone to subtle hallucinations, and require significant developer time to manually cross-reference against the actual codebase.

Furthermore, unconstrained LLMs may generate recommendations that directly contradict verified static security findings (e.g., advising direct reuse of a component known to harbor a critical vulnerability).

## Decision
We implemented a **Grounded AI Reasoning Layer** positioned strictly downstream of deterministic analysis and reuse evaluation, equipped with **programmatic citation validation and security gate preservation**.

Key mechanisms:
1. **Evidence-Bounded Context Packaging**: Only pre-computed deterministic evidence chunks (`EvidenceChunk`) are provided in the prompt context, each assigned a deterministic identifier (`[E1]`, `[E2]`).
2. **Hard Context Budgeting**: `ContextBudgetManager` enforces hard caps (max 10 chunks, 16,000 characters, 4,000 tokens) to prevent context flooding and ensure high evidence relevance.
3. **Structured Response Contracts**: The LLM is forced to emit structured JSON conforming to a schema containing `summary`, `recommendation`, `reasoning` claims with explicit evidence citation arrays, `limitations`, and `confidence`.
4. **Automated Citation Validation**: `GroundingValidator` programmatically inspects the response to ensure:
   - Every cited `[E#]` ID exists in the provided context prompt (detects hallucinated citations).
   - Citation coverage is computed across all assertions.
   - The **Security Gate Invariant** is preserved: If static analysis marked a candidate `BLOCKED`, the LLM cannot recommend direct reuse.
5. **Clear Epistemic Boundary**: The system explicitly documents that citation validation confirms *evidence identifier existence and context inclusion*, but does *not* mathematically prove natural-language assertion truth.

## Alternatives Considered
1. **Unconstrained Free-Form Text Prompting**:
   - Allowing the LLM to output free-form markdown without structured evidence arrays.
   - *Rejected*: Incurred high hallucination rates, made automated verification impossible, and obscured citations.
2. **Fine-Tuning a Custom LLM**:
   - Fine-tuning a model specifically for CodeMind AI citations.
   - *Rejected*: High compute costs, vendor lock-in, and rapid obsolescence compared to an SPI provider abstraction.

## Consequences
### Positive:
- **Traceable Reasoning**: Every recommendation is visually and structurally linked back to exact repository lines and metrics.
- **Hallucination Suppression**: Restricting context to curated evidence chunks dramatically reduces invented APIs and classes.
- **Enforced Safety Guardrails**: Programmatic post-processing prevents the LLM from bypassing security gate decisions.

### Negative / Trade-offs:
- Parsing structured JSON requires strict error handling and optional single-repair retry logic.
- Complex multi-file reasoning that spans dozens of packages may exceed the 10-chunk context budget.

## Security Implications
- Neutralizes prompt injection attempts by encapsulating evidence within strict delimiter boundaries and treating repository text as untrusted data.
- Prevents the generative tier from overriding static security policies.
