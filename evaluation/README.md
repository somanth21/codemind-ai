# CodeMind AI — Empirical Evaluation Harness (Phase 10)

This directory contains the reproducible, automated evaluation harness, benchmark fixtures, ground-truth labels, operational baseline configurations, and machine-readable empirical results for **CodeMind AI**.

> **Framing Note**: These results represent an **Initial Pilot Benchmark** evaluated across legal synthetic micro-benchmarks and standardized open-source Java repositories (`Spring PetClinic`, `Apache Commons Lang 3`, `OWASP Benchmark`). Results demonstrate the internal validity and architectural differentiators of CodeMind AI without making over-generalized claims beyond the tested scope.

---

## 1. Directory Structure

```
evaluation/
  README.md                          # Reproduction guide, mathematical metric definitions, and harness architecture
  datasets/
    manifest.json                    # Metadata, licenses, checksums, and acquisition commands for all corpora
    fixtures/                        # Legally redistributable micro-benchmark Java fixtures with known ground truth
      SecurityPositiveFixtures.java  # Known vulnerable patterns across 8 security rules
      SecurityNegativeFixtures.java  # Clean controls / true negatives across 8 security rules
      ArchitectureFixtures.java      # 2-node cycles, 3-node cycles, and clean layered packages
      ReuseFixtures.java             # Exact reuse, adaptable logic, high-complexity CC>15 candidates
  queries/
    retrieval-queries.json           # Labeled queries (RQ-001 through RQ-008) with relevant files and symbols
  labels/
    reuse-labels.json                # Labeled reuse requests across 5 decision classes & security gating
    security-labels.json             # Labeled security cases (16 TP/TN pairs across 8 rules)
    architecture-labels.json         # Labeled cycles, design smells, and Martin coupling metrics
    grounding-labels.json            # Grounded AI reasoning cases with expected evidence mappings
  baselines/
    baselines-config.json            # Operational definitions for B0, B1, B2, B3, P, and ablations A1-A5
  results/
    retrieval-results.json           # Machine-readable output for retrieval evaluation
    reuse-results.json               # Machine-readable output for reuse decision evaluation (with 5x5 confusion matrices)
    security-results.json            # Machine-readable output for security detection evaluation
    architecture-results.json        # Machine-readable output for architecture evaluation
    grounding-results.json           # Machine-readable output for grounding & citation fidelity
    context-results.json             # Machine-readable output for context reduction & token efficiency
    ablation-results.json            # Machine-readable output for ablation studies (A1-A5 vs P)
    summary.json                     # Aggregate summary of all empirical metrics with full provenance
  scripts/
    __init__.py
    provenance.py                    # Metadata extraction: git commit HEAD, UTC timestamps, configuration hashing
    metrics.py                       # Mathematical formulas: P@K, R@K, MRR, nDCG, Confusion Matrix, FPR, F1, UNCR, FRR
    eval_retrieval.py                # Retrieval evaluation runner (Lexical B1, Hybrid B2, Proposed P)
    eval_reuse.py                    # Reuse-first decision evaluation runner (5 classes, confusion matrix)
    eval_security.py                 # Security detection evaluation runner (TP & TN cases across 8 rules)
    eval_architecture.py             # Architecture cycle and smell evaluation runner
    eval_grounding.py                # Grounded AI citation coverage and validity evaluation runner
    eval_context.py                  # Context efficiency runner (character vs. estimated vs. actual tokens)
    eval_ablations.py                # Isolated ablation studies runner (A1-A5 and baselines B0-B3 vs P)
    run_all_evaluations.py           # Master execution script generating all results/*.json
    test_evaluation_harness.py       # Unit test suite verifying metric algorithms, edge cases, N/A handling
```

---

## 2. Environment & Prerequisites

The evaluation harness is implemented in **Python 3.10+** using **only the Python Standard Library** (`json`, `math`, `sys`, `os`, `subprocess`, `datetime`, `unittest`). No external third-party packages or virtual environment installations are required.

- **Python Version**: Python 3.10+ (tested on Python 3.10.0)
- **Dependencies**: None (Zero external dependencies)
- **Platforms**: Windows, Linux, macOS

---

## 3. Reproduction Commands

### Run Unit Tests
Verifies mathematical metric calculations, zero-division `N/A` handling, and provenance stamping:
```powershell
python evaluation/scripts/test_evaluation_harness.py
```

### Run Full Benchmark Suite
Executes all evaluation modules, regenerates all 8 JSON files in `evaluation/results/`, and prints a formatted terminal summary:
```powershell
python evaluation/scripts/run_all_evaluations.py
```

### Run Individual Domain Evaluators
```powershell
# 1. Retrieval
python evaluation/scripts/eval_retrieval.py

# 2. Reuse Decisions
python evaluation/scripts/eval_reuse.py

# 3. Security Detection
python evaluation/scripts/eval_security.py

# 4. Architecture Intelligence
python evaluation/scripts/eval_architecture.py

# 5. Grounded Reasoning
python evaluation/scripts/eval_grounding.py

# 6. Context Reduction
python evaluation/scripts/eval_context.py

# 7. Ablation Studies
python evaluation/scripts/eval_ablations.py
```

---

## 4. Operational Baseline Definitions

The evaluation harness evaluates the following exact baseline configurations defined in `evaluation/baselines/baselines-config.json`:

| Baseline | Name | Description | Applicable Metrics |
| :--- | :--- | :--- | :--- |
| **B0** | **Zero Context** | No repository retrieval. Generates outputs without codebase context. | Reuse accuracy, UNCR, Context reduction. (Retrieval metrics strictly report `N/A`). |
| **B1** | **Lexical Retrieval** | PostgreSQL full-text search (`tsvector` / keyword token overlap) only. | P@K, R@K, MRR, nDCG@K. |
| **B2** | **Hybrid Retrieval** | Lexical + dense semantic vector retrieval combined via Reciprocal Rank Fusion (RRF, $k=60$). No reuse scoring, security gating, or architecture analysis. | P@K, R@K, MRR, nDCG@K. |
| **B3** | **Retrieval + Basic Reuse** | Hybrid retrieval paired with naive syntactic token overlap reuse scoring. Lacks multi-criteria 8D evaluation and hard security gating. | Reuse decision accuracy, Security violations. |
| **P** | **Proposed System** | Complete CodeMind AI pipeline: Hybrid RRF retrieval + symbol boosting, 8-dimensional multi-criteria reuse evaluation, hard security gating (`CRITICAL`/`HIGH` $\to$ `BLOCKED`), architecture coupling analysis, and bounded grounded evidence selection. | All evaluation categories. |

### Evaluation Ablations (A1–A5)

| Ablation | Target Component | Description |
| :--- | :--- | :--- |
| **A1** | Semantic Retrieval | Evaluates Proposed system with semantic vector embeddings removed (Lexical only). |
| **A2** | Reuse Scoring Engine | Evaluates Proposed system without 8D deterministic reuse evaluation (direct LLM decision). |
| **A3** | Security Blocker Gate | Evaluates Proposed system with the hard security gate removed (advisory only; simulated in isolated evaluation harness). |
| **A4** | Architecture Intelligence | Evaluates Proposed system without package cyclic dependency or coupling metrics. |
| **A5** | Grounded Evidence Selection | Evaluates Proposed system with bounded evidence chunking disabled (raw unconstrained context dump). |

---

## 5. Mathematical Metric Definitions

### 5.1 Retrieval Metrics
- **Precision@K**:
  $$\text{Precision}@K = \frac{|\text{Retrieved}_{1..K} \cap \text{Relevant}|}{K}$$
- **Recall@K**:
  $$\text{Recall}@K = \begin{cases} \frac{|\text{Retrieved}_{1..K} \cap \text{Relevant}|}{|\text{Relevant}|} & \text{if } |\text{Relevant}| > 0 \\ \text{"N/A"} & \text{if } |\text{Relevant}| = 0 \end{cases}$$
- **Mean Reciprocal Rank (MRR)**:
  $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
  where $\text{rank}_i$ is the rank of the first relevant item for query $i$ (or 0 if no relevant item is found).
- **Normalized Discounted Cumulative Gain (nDCG@K)**:
  $$\text{DCG}@K = \sum_{i=1}^{\min(K, N)} \frac{2^{\text{rel}_i} - 1}{\log_2(i + 1)}, \quad \text{nDCG}@K = \frac{\text{DCG}@K}{\text{IDCG}@K}$$

### 5.2 Classification & Security Metrics
- **Accuracy**: $\frac{TP + TN}{TP + FP + TN + FN}$
- **Precision**: $\frac{TP}{TP + FP}$ (returns `"N/A"` if $TP + FP = 0$)
- **Recall**: $\frac{TP}{TP + FN}$ (returns `"N/A"` if $TP + FN = 0$)
- **F1 Score**: $\frac{2 \cdot \text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$ (returns `"N/A"` if Precision or Recall is `"N/A"`)
- **False Positive Rate (FPR)**: $\frac{FP}{FP + TN}$ (returns `"N/A"` if $FP + TN = 0$)
- **False Negative Rate (FNR)**: $\frac{FN}{FN + TP}$ (returns `"N/A"` if $FN + TP = 0$)

### 5.3 Grounded AI Reasoning Metrics
- **Citation Precision**: $\frac{|\text{Cited Evidence IDs} \cap \text{Ground Truth Evidence IDs}|}{|\text{Cited Evidence IDs}|}$
- **Citation Recall**: $\frac{|\text{Cited Evidence IDs} \cap \text{Ground Truth Evidence IDs}|}{|\text{Ground Truth Evidence IDs}|}$
- **Unsupported Claim Rate (UNCR)**:
  $$\text{UNCR} = \frac{\text{Claims without valid evidence citations}}{\text{Total reasoning claims}}$$
- **Faithful Reasoning Rate (FRR)**:
  $$\text{FRR} = \frac{\text{Cases where recommendation directly follows from cited evidence}}{\text{Total evaluated cases}}$$

### 5.4 Context Efficiency Metrics
- **Character Reduction %**:
  $$\frac{\text{Chars}_{\text{Naive}} - \text{Chars}_{\text{Bounded}}}{\text{Chars}_{\text{Naive}}} \times 100\%$$
- **Estimated Token Reduction %**:
  Calculated using standard 4 characters per token heuristic ($\text{tokens} = \max(1, \lfloor \text{chars} / 4 \rfloor)$).
- **Actual Provider Token Reduction %**:
  Calculated directly from LLM provider API token metadata if available; **strictly reports `"N/A"`** when operating in offline/pilot benchmark environments without live provider tracking.

---

## 6. Strict N/A Handling & Provenance Guarantees

1. **No Conflating N/A with Zero**: Non-applicable combinations (such as B0 Precision@1 or rules without positive samples) return the string `"N/A"`. They are never converted into 0.0 or omitted silently.
2. **Result Provenance Stamping**: Every evaluated query, test case, baseline, and ablation record automatically captures the following immutable schema:
   ```json
   {
     "dataset_version": "1.0.0",
     "case_id": "<CASE_ID>",
     "system_configuration": "<SYSTEM_ID>",
     "git_commit": "<GIT_COMMIT_HASH>",
     "timestamp": "<ISO_8601_UTC_TIMESTAMP>",
     "metric_definition_version": "1.0.0"
   }
   ```
