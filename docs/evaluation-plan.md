# CodeMind AI — Empirical Evaluation Plan

This document specifies the formal experimental protocol, benchmark datasets, evaluation metrics, and comparative procedures designed to assess the performance, accuracy, and safety of CodeMind AI.

---

## 1. Evaluation Datasets

To ensure reproducibility and representative coverage, evaluation uses three benchmark repository suites:

1. **Synthetic Validation Suite (Micro-Benchmarks)**:
   - Curated repositories with known ground-truth properties:
     - Exact duplicate methods and classes.
     - Known circular dependencies (2-node, 3-node, and 5-node cyclic chains).
     - Known architectural bottlenecks (god packages, high fan-out hubs).
     - Known security vulnerabilities (hardcoded AWS/GitHub secrets, command execution, SQL concatenation, path traversal, weak crypto).
2. **Standard Academic Repositories**:
   - Open-source reference repositories with established software metrics:
     - *Spring PetClinic* (micro-enterprise Spring Boot application).
     - *Apache Commons Lang* (extensive utility library with high reuse surface).
     - *JGit* (deep class hierarchy and complex call relationships).
3. **Vulnerability Benchmark Corpora**:
   - Curated samples from the *OWASP Benchmark for Java* and *Juliet Test Suite for Java* covering CWE-798, CWE-78, CWE-22, CWE-327, CWE-89, CWE-502, CWE-306, and CWE-532.

---

## 2. Experimental Protocols & Metrics

### 2.1 Repository Retrieval Evaluation

Evaluates the effectiveness of CodeMind's Hybrid Retrieval Engine relative to individual sparse and dense baselines.

- **Configurations Compared**:
  - `Lexical Only`: Exact symbol names and tokenized BM25 matching.
  - `Semantic Only`: Dense vector cosine similarity via pgvector.
  - `Hybrid (RRF)`: Reciprocal Rank Fusion ($k = 60$) combining lexical and dense scores.
- **Metrics**:
  - **Precision@K** ($K \in \{1, 3, 5, 10\}$): Proportion of retrieved candidate chunks that represent genuine functional matches.
  - **Recall@K** ($K \in \{1, 3, 5, 10\}$): Proportion of all relevant ground-truth symbols retrieved within top-$K$.
  - **Mean Reciprocal Rank (MRR)**: Average reciprocal rank of the first relevant candidate across the evaluation query set:
    $$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$

---

### 2.2 Reuse-First Decision Engine Evaluation

Evaluates the decision accuracy, safety, and calibration of the multi-criteria reuse engine.

- **Metrics**:
  - **Reuse Decision Accuracy**: Percentage of test queries where the system's recommended strategy (`REUSE_DIRECTLY`, `ADAPT`, `COMPOSE`, `EXTEND`, `CREATE_NEW`) matches the human ground-truth expert decision.
  - **False Reuse Rate (FRR)**: Percentage of scenarios where the system recommends reusing an incompatible, incorrect, or inadequate component:
    $$\text{FRR} = \frac{\text{Incorrect Reuse Decisions}}{\text{Total Non-Reusable Scenarios}}$$
  - **Unnecessary New Code Rate (UNCR)**: Percentage of scenarios where a suitable repository component exists, but the system recommends `CREATE_NEW`:
    $$\text{UNCR} = \frac{\text{Unnecessary New Code Recommendations}}{\text{Total Reusable Scenarios}}$$
  - **Confidence Calibration (Expected Calibration Error - ECE)**: Measures whether predicted confidence scores $C \in [0, 1]$ correspond to empirical accuracy across probability bins.

---

### 2.3 Security Analysis Engine Evaluation

Evaluates the deterministic static analysis rules against labeled vulnerability datasets.

- **Metrics**:
  - **Precision**: $\frac{TP}{TP + FP}$ across each of the 8 implemented security rules.
  - **Recall**: $\frac{TP}{TP + FN}$ across labeled benchmark instances.
  - **F1 Score**: Harmonic mean of Precision and Recall.
  - **False Positive Rate (FPR)**: $\frac{FP}{FP + TN}$ on clean, non-vulnerable control files.
  - **Security Gate Blocker Consistency**: 100% assertion that any candidate with a `CRITICAL` or `HIGH` finding is gated to `BLOCKED`.

---

### 2.4 Architecture Intelligence Evaluation

Evaluates package coupling metrics, cycle discovery, and design smell detection against structural ground truth.

- **Metrics**:
  - **Cycle Discovery Recall**: Percentage of actual circular package and class dependency chains detected.
  - **Cycle Deduplication Accuracy**: Verification that cyclic permutations (e.g., $A \to B \to A$ vs. $B \to A \to B$) are deduplicated to a single canonical rotation.
  - **Coupling Accuracy**: Agreement between computed ($C_a, C_e, I$) metrics and verified manual dependency counts.
  - **Hotspot & Smell Detection Rate**: Precision and recall on known god packages and fragile high fan-out hubs.

---

### 2.5 Grounded AI Reasoning Layer Evaluation

Evaluates the downstream LLM interpretation layer's grounding, citation fidelity, and context efficiency.

- **Metrics**:
  - **Citation Coverage Ratio**: Percentage of natural-language reasoning claims accompanied by at least one valid evidence citation `[E#]`:
    $$\text{Coverage} = \frac{\text{Claims with Valid Citations}}{\text{Total Claims Generated}}$$
  - **Invalid Citation Rate (ICR)**: Percentage of generated citations that reference non-existent or unsupplied evidence IDs:
    $$\text{ICR} = \frac{\text{Citations with Unsupplied IDs}}{\text{Total Citations Made}}$$
  - **Evidence Utilization Rate**: Percentage of evidence chunks supplied in the context budget that were actively cited in the generated explanation.
  - **Context Budget Efficiency**: Average prompt character count, token count, and context truncation frequency under the hard cap (10 chunks / 16k chars / 4k tokens).
  - **Response Latency**: End-to-end processing duration in milliseconds.

> [!IMPORTANT]
> ### Critical Distinction: Citation Validity vs. Factual Correctness
> **Citation Validity** verifies deterministically that:
> 1. An identifier `[E#]` referenced in the output text was present in the structured prompt context.
> 2. The cited chunk corresponds to an existing, verified repository symbol, metric, or finding.
> 
> **Factual Correctness** denotes whether the natural-language assertions made by the LLM are semantically and logically true. Citation verification alone **does not guarantee factual correctness**. Semantic truth must be independently verified via human evaluation or formal semantic validation.
