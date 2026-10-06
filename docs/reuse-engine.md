# Deterministic Reuse-First Engine (Phase 5)

## 1. Problem Definition: Reuse-First Engineering

In modern repository-scale software development, autonomous coding assistants and developers frequently introduce redundant implementations of utility functions, data mappers, and domain services. This code duplication causes:

- **Maintenance Fragmentation**: Multiple competing implementations of identical algorithms drift and incur duplicate maintenance burdens.
- **Security Vulnerability Proliferation**: When code is reimplemented instead of reusing an audited repository component, new bugs, vulnerabilities, or hardcoded secrets are repeatedly reintroduced.
- **Cognitive Overhead**: Code reviewers must inspect and evaluate new code when an established, tested, and actively utilized component already exists in the repository.

**CodeMind AI** establishes a **Reuse-First Decision Invariant**:
> Before recommending or generating new code, the system deterministically evaluates existing repository assets across functional, structural, maintainability, and security criteria. If a safe, high-quality component exists, CodeMind prioritizes direct reuse, adaptation, composition, or extension over writing new code.

---

## 2. Research Positioning & Contributions

CodeMind AI explicitly does **NOT** claim to be the first system to perform repository-aware code reuse. Prior research explores repository-level code generation, AST clone detection, and symbol-aware coding assistants.

The novel contribution of CodeMind AI is the combination of:
1. **Deterministic Static Evidence**: Reusing symbols, metrics, call graphs, quality findings, and secret detections derived directly from AST analysis without stochastic LLM hallucination.
2. **Multi-Criteria Evaluation**: Balancing semantic relevance against maintainability, complexity, modification effort, and security gates.
3. **Hard Security Invariants**: Zero-tolerance security gating where candidates with secrets or critical findings can never receive a `REUSE_DIRECTLY` recommendation.
4. **Line-Level Provenance & Explainability**: Every recommendation is justified by transparent positive signals, negative caveats, and exact source code line citations.
5. **Pre-Generation Decision Matrix**: Enforcing a strict reuse decision policy *prior* to any downstream AI reasoning.

---

## 3. Multi-Criteria Scoring Formulation

Given a user intent query $Q$ and a discovered candidate symbol $S$ with associated metrics $M$, static findings $F$, and call graph relationships $R$:

### Criteria Definitions

1. **Functional Relevance ($FR \in [0, 1]$)**:
   - Evaluated via exact name matching (1.0), substring matching (0.85), and tokenized Jaccard overlap between query tokens and symbol signature/FQN tokens.
2. **Structural Similarity ($SS \in [0, 1]$)**:
   - Method vs class structural appropriateness, parameter count matching, and active usage bonus ($+0.05 \times \text{callers}$, capped at $0.15$).
3. **Maintainability Score ($MS \in [0, 1]$)**:
   - Normalized from the AST Maintainability Index ($MI \in [0, 100]$):
   $$\text{MS} = \text{clamp}\left(0.0, 1.0, \frac{\text{MI}}{100.0}\right)$$
4. **Complexity Penalty ($CP \in [0, 1]$)**:
   - Normalized McCabe Cyclomatic Complexity ($CC$):
   $$\text{CP} = \text{clamp}\left(0.0, 1.0, \frac{\text{CC}}{25.0}\right)$$
5. **Security Score ($SEC \in [0, 1]$)**:
   - If candidate file contains any hardcoded secret: $SEC = 0.0$.
   - If candidate has critical/high quality findings: $SEC = 0.10$.
   - If candidate has medium quality findings: $SEC = \max(0.20, 1.0 - 0.25 \times N_{\text{med}})$.
   - If clean (0 findings): $SEC = 1.0$.
6. **Modification Effort ($ME \in [0, 1]$)**:
   - Calculated as $(1.0 - FR) \times 0.50$ plus penalties for oversized functions ($LOC > 80 \implies +0.15$, $LOC > 200 \implies +0.30$) and high existing caller coupling ($>5 \text{ callers} \implies +0.10$).
7. **Dependency Impact ($DI \in [0, 1]$)**:
   - Normalized callee count: $\min(1.0, \frac{\text{callees}}{10.0})$.
8. **Duplication Risk ($DR \in [0, 1]$)**:
   - If $FR \ge 0.80$, writing new code creates duplicate logic ($DR = FR$).

### Weighted Composite Score

Using configurable weights that sum to 1.0:
- $w_{\text{rel}} = 0.35$
- $w_{\text{struct}} = 0.15$
- $w_{\text{maint}} = 0.15$
- $w_{\text{sec}} = 0.15$
- $w_{\text{comp}} = 0.10$
- $w_{\text{effort}} = 0.10$

Penalties are inverted into positive dimensions $(1 - \text{penalty})$, ensuring composite score remains bounded in $[0, 1]$:
$$\text{BaseComposite} = w_{\text{rel}} FR + w_{\text{struct}} SS + w_{\text{maint}} MS + w_{\text{sec}} SEC + w_{\text{comp}} (1 - CP) + w_{\text{effort}} (1 - ME)$$

### Security Dampening Factor
To enforce that security risks severely penalize candidate viability, the composite score is dampened by the candidate's security profile:
$$\text{OverallScore} = \text{BaseComposite} \times (0.40 + 0.60 \times SEC)$$

---

## 4. Security Gating Model

| Security Gate Status | Conditions | Permitted Candidate Decisions |
| :--- | :--- | :--- |
| **`SAFE`** | 0 hardcoded secrets, 0 critical/high findings, $SEC \ge 0.60$ | `DIRECT_REUSE`, `ADAPT`, `EXTEND`, `COMPOSE` |
| **`CAUTION`** | Medium quality findings, or $SEC < 0.60$ | `ADAPT`, `EXTEND` (requires manual review) |
| **`BLOCKED`** | Any hardcoded secret, or critical/high static finding | `REJECT` only (strictly forbidden from `DIRECT_REUSE`) |

---

## 5. Decision Policy Matrix

The policy engine categorizes candidates and selects a repository-level recommendation:

| Candidate Classification | Criteria |
| :--- | :--- |
| **`DIRECT_REUSE`** | Security == `SAFE` $\land$ OverallScore $\ge 0.75 \land FR \ge 0.70 \land$ Concrete callable |
| **`EXTEND`** | Candidate is `CLASS` or `INTERFACE` (or abstract) $\land$ OverallScore $\ge 0.50$ |
| **`ADAPT`** | OverallScore $\ge 0.50 \land FR \ge 0.40$ |
| **`COMPOSE`** | Multi-component query $\land$ Multiple candidates with OverallScore $\ge 0.55$ |
| **`REJECT`** | Security == `BLOCKED` $\lor$ OverallScore $< 0.25$ |

### Repository Decision Precedence

1. If top valid candidate is `DIRECT_REUSE` $\implies$ **`REUSE_DIRECTLY`**
2. If 2+ complementary candidates with OverallScore $\ge 0.55$ and query indicates composition $\implies$ **`COMPOSE_EXISTING_COMPONENTS`**
3. If top candidate is `EXTEND` $\implies$ **`EXTEND_EXISTING_COMPONENT`**
4. If top candidate is `ADAPT` $\implies$ **`REUSE_WITH_ADAPTATION`**
5. Otherwise $\implies$ **`CREATE_NEW`**

---

## 6. Provenance & Explainability

Every candidate recommendation produces:
- **Positive Signals**: Explicit justifications for reuse (e.g. *"High functional relevance (100%) matching query intent"*, *"Active in codebase with 5 callers"*, *"Clean security audit: 0 secrets"*).
- **Caveats & Warnings**: Explicit risks requiring developer attention (e.g. *"Elevated cyclomatic complexity (approx. 18)"*, *"Parameter differences may require adaptation"*).
- **Line-Level Provenance Evidence**:
  - `SYMBOL_DECLARATION`: Exact filepath and line range (`startLine`-`endLine`).
  - `CALLER_USAGE`: Count and citations of active callers.
  - `CALLEE_DEPENDENCY`: Count and citations of callee dependencies.
  - `QUALITY_METRIC`: Maintainability Index and Cyclomatic Complexity values.
  - `SECURITY_FINDING`: Detected findings and secret masks.
  - `DUPLICATION_SIGNAL`: Duplication prevention score.

---

## 7. Research Benchmark Evaluation

The research evaluation framework (`ReuseEvaluationService`) tests 5 standard benchmark scenarios:

1. **Exact Match Helper Method**: Direct match with high MI and active callers $\implies$ `REUSE_DIRECTLY` (Expected: PASS).
2. **Signature/Parameter Mismatch**: Partial match requiring wrapper or parameter adaptation $\implies$ `REUSE_WITH_ADAPTATION` (Expected: PASS).
3. **Extensible Framework Base**: Abstract class with extensible methods $\implies$ `EXTEND_EXISTING_COMPONENT` (Expected: PASS).
4. **Security-Blocked Method**: High relevance method whose source file contains hardcoded secrets $\implies$ `CREATE_NEW` (Expected: PASS, Security Gate: `BLOCKED`).
5. **Novel Domain Feature**: Completely unrelated feature with no repository match $\implies$ `CREATE_NEW` (Expected: PASS).

### Evaluation Metrics
- **Decision Accuracy**: $\frac{\text{Correct Decisions}}{\text{Total Scenarios}} = 100\%$ ($5/5$)
- **False Reuse Rate (FRR)**: $0.0\%$ (0 unsafe or incorrect direct reuses)
- **Unnecessary New Code Rate (UNCR)**: $0.0\%$ (0 missed direct reuses)
