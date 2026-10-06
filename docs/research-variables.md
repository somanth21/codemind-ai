# CodeMind AI — Research Variables Taxonomy

This document formalizes the variables defined for empirical evaluation of CodeMind AI, categorized into Independent Variables (manipulated), Dependent Variables (measured), and Controlled Variables (held constant).

---

## 1. Independent Variables (Manipulated Factors)

| Variable Name | Levels / Values | Description |
|---|---|---|
| **Retrieval Strategy ($IV_1$)** | `{LEXICAL, SEMANTIC, HYBRID_RRF}` | The algorithm used to retrieve repository evidence chunks: exact token BM25, dense embeddings cosine distance, or Reciprocal Rank Fusion ($k=60$). |
| **Reuse Engine Activation ($IV_2$)** | `{ENABLED, DISABLED}` | Whether the deterministic 8-criteria reuse evaluation engine and decision policy are active before recommendations. |
| **Security Gating ($IV_3$)** | `{ENABLED, DISABLED}` | Whether static security findings (`CRITICAL`, `HIGH`, `MEDIUM`) programmatically enforce `BLOCKED` or `CAUTION` gates on reuse candidates. |
| **Architecture Intelligence ($IV_4$)** | `{ENABLED, DISABLED}` | Whether package coupling metrics ($C_a, C_e, I$), cycle chains, and hotspot evidence are included in evidence selection. |
| **Grounded AI Reasoning ($IV_5$)** | `{GROUNDED_CONSTRAINED, UNCONSTRAINED, DISABLED}` | The operational mode of the downstream reasoning layer: grounded with citation verification, unconstrained prompt without verification, or purely deterministic output. |

---

## 2. Dependent Variables (Measured Outcomes)

### 2.1 Retrieval Performance
- **$DV_{1.1}$ (Precision@K)**: Proportion of retrieved candidates within top-$K$ that are relevant.
- **$DV_{1.2}$ (Recall@K)**: Proportion of all relevant ground-truth symbols retrieved within top-$K$.
- **$DV_{1.3}$ (MRR)**: Mean Reciprocal Rank of the first relevant candidate.

### 2.2 Reuse Decision Quality
- **$DV_{2.1}$ (Decision Accuracy)**: Percentage of correct strategy recommendations (`REUSE_DIRECTLY`, `ADAPT`, `COMPOSE`, `EXTEND`, `CREATE_NEW`).
- **$DV_{2.2}$ (False Reuse Rate - FRR)**: Frequency of recommending reuse of an incompatible or incorrect component.
- **$DV_{2.3}$ (Unnecessary New Code Rate - UNCR)**: Frequency of recommending `CREATE_NEW` when an existing component fits.
- **$DV_{2.4}$ (Vulnerability Leakage Rate)**: Frequency of recommending reuse of a component harboring a known high/critical vulnerability.

### 2.3 Grounding & Citation Quality
- **$DV_{3.1}$ (Citation Coverage Ratio)**: Proportion of generated reasoning claims substantiated with valid `[E#]` evidence citations.
- **$DV_{3.2}$ (Invalid Citation Rate - ICR)**: Proportion of generated citations that reference non-existent evidence IDs.
- **$DV_{3.3}$ (Evidence Utilization Rate)**: Proportion of supplied context chunks actively referenced in the response.

### 2.4 Computational Efficiency
- **$DV_{4.1}$ (Context Size in Characters)**: Total character volume of prompt context.
- **$DV_{4.2}$ (Token Consumption)**: Prompt tokens, completion tokens, and total token count per request.
- **$DV_{4.3}$ (Execution Latency)**: Wall-clock processing time (ms) partitioned into extraction, retrieval, scoring, and LLM inference.
- **$DV_{4.4}$ (Context Truncation Rate)**: Percentage of requests where evidence chunks exceeded the context budget.

---

## 3. Controlled Variables (Held Constant)

To eliminate confounding influences across experimental trials, the following factors are strictly controlled:

| Controlled Factor | Standard Constant Value | Rationale |
|---|---|---|
| **Evaluation Repository Set** | Fixed benchmark suite (Micro-benchmarks, PetClinic, Commons Lang, JGit) | Prevents variance due to codebase size, language idioms, or modularity differences. |
| **Evaluation Query Set** | Fixed set of 200 standardized engineering intent prompts | Ensures consistent difficulty and intent distribution across trials. |
| **Top-K Retrieval Limit** | $K = 10$ candidates | Controls candidate search space across all retrieval configurations. |
| **Context Character Budget** | 16,000 characters | Enforces identical maximum context boundaries across LLM prompts. |
| **Context Token Budget** | 4,000 tokens | Standardizes maximum token payload sent to external providers. |
| **LLM Model & Version** | `gemini-1.5-pro` (or equivalent fixed snapshot) | Prevents capability drift between model versions. |
| **LLM Sampling Temperature** | $T = 0.0$ (deterministic greedy sampling) | Minimizes stochastic variance in generative reasoning outputs. |
| **Embedding Model** | Fixed 768-dimensional text embedding model | Maintains uniform vector representation and distance geometry. |
| **Scoring Weights** | $w_{\text{func}}=0.30, w_{\text{struct}}=0.20, w_{\text{maint}}=0.15, w_{\text{sec}}=0.15, w_{\text{dup}}=0.10, w_{\text{eff}}=0.10$ | Controls multi-criteria utility function across trials. |
