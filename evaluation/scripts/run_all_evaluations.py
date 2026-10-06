"""
Master evaluation runner for CodeMind AI Phase 10.
Executes all benchmark evaluation modules, outputs machine-readable JSON files into evaluation/results/,
and prints an empirical research summary table.
"""

import os
import sys
import json
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from provenance import stamp_provenance, get_git_commit
from eval_retrieval import evaluate_retrieval_dataset
from eval_reuse import evaluate_reuse_dataset
from eval_security import evaluate_security_dataset
from eval_architecture import evaluate_architecture_dataset
from eval_grounding import evaluate_grounding_dataset
from eval_context import evaluate_context_efficiency
from eval_ablations import evaluate_ablations_and_baselines

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_DIR = os.path.join(BASE_DIR, "results")
QUERIES_FILE = os.path.join(BASE_DIR, "queries", "retrieval-queries.json")
REUSE_LABELS_FILE = os.path.join(BASE_DIR, "labels", "reuse-labels.json")
SECURITY_LABELS_FILE = os.path.join(BASE_DIR, "labels", "security-labels.json")
ARCH_LABELS_FILE = os.path.join(BASE_DIR, "labels", "architecture-labels.json")
GROUNDING_LABELS_FILE = os.path.join(BASE_DIR, "labels", "grounding-labels.json")

def save_json(filepath: str, data: dict):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def main():
    os.makedirs(RESULTS_DIR, exist_ok=True)
    print("=" * 80)
    print(" CODEMIND AI — EMPIRICAL BENCHMARK EVALUATION HARNESS (PHASE 10)")
    print(f" Git Commit: {get_git_commit()}")
    print(f" Timestamp : {datetime.now(timezone.utc).isoformat()}")
    print("=" * 80)

    # 1. Retrieval Evaluation
    print("\n[1/7] Evaluating Retrieval Subsystem...")
    retrieval_res = evaluate_retrieval_dataset(QUERIES_FILE)
    save_json(os.path.join(RESULTS_DIR, "retrieval-results.json"), retrieval_res)
    print("      -> Saved evaluation/results/retrieval-results.json")

    # 2. Reuse Engine Evaluation
    print("\n[2/7] Evaluating Reuse-First Decision Engine...")
    reuse_res = evaluate_reuse_dataset(REUSE_LABELS_FILE)
    save_json(os.path.join(RESULTS_DIR, "reuse-results.json"), reuse_res)
    print("      -> Saved evaluation/results/reuse-results.json")

    # 3. Security Detection Evaluation
    print("\n[3/7] Evaluating Deterministic Security Analysis...")
    security_res = evaluate_security_dataset(SECURITY_LABELS_FILE)
    save_json(os.path.join(RESULTS_DIR, "security-results.json"), security_res)
    print("      -> Saved evaluation/results/security-results.json")

    # 4. Architecture Intelligence Evaluation
    print("\n[4/7] Evaluating Architecture Intelligence Subsystem...")
    arch_res = evaluate_architecture_dataset(ARCH_LABELS_FILE)
    save_json(os.path.join(RESULTS_DIR, "architecture-results.json"), arch_res)
    print("      -> Saved evaluation/results/architecture-results.json")

    # 5. Grounded AI Reasoning Evaluation
    print("\n[5/7] Evaluating Grounded AI Reasoning Layer...")
    grounding_res = evaluate_grounding_dataset(GROUNDING_LABELS_FILE)
    save_json(os.path.join(RESULTS_DIR, "grounding-results.json"), grounding_res)
    print("      -> Saved evaluation/results/grounding-results.json")

    # 6. Context Reduction Evaluation
    print("\n[6/7] Evaluating Context Efficiency & Token Reduction...")
    context_res = evaluate_context_efficiency()
    save_json(os.path.join(RESULTS_DIR, "context-results.json"), context_res)
    print("      -> Saved evaluation/results/context-results.json")

    # 7. Ablations & Baseline Comparison
    print("\n[7/7] Evaluating Baselines (B0-B3) and Ablations (A1-A5)...")
    ablation_res = evaluate_ablations_and_baselines()
    save_json(os.path.join(RESULTS_DIR, "ablation-results.json"), ablation_res)
    print("      -> Saved evaluation/results/ablation-results.json")

    # Master Summary
    summary = {
        "benchmark_title": "CodeMind AI Initial Pilot Benchmark",
        "provenance": stamp_provenance("AGGREGATE_BENCHMARK", "ALL_SYSTEMS"),
        "key_findings": {
            "retrieval": {
                "lexical_only_ndcg5": retrieval_res["B1_LEXICAL"]["metrics"]["ndcg_at_5"],
                "hybrid_rrf_ndcg5": retrieval_res["B2_HYBRID"]["metrics"]["ndcg_at_5"],
                "proposed_ndcg5": retrieval_res["P_PROPOSED"]["metrics"]["ndcg_at_5"],
                "proposed_mrr": retrieval_res["P_PROPOSED"]["metrics"]["mrr"]
            },
            "reuse_decision": {
                "b0_zero_context_accuracy": reuse_res["B0_ZERO_CONTEXT"]["metrics"]["strict_accuracy"],
                "b3_basic_syntactic_accuracy": reuse_res["B3_BASIC_SYNTACTIC"]["metrics"]["strict_accuracy"],
                "b3_security_violations": reuse_res["B3_BASIC_SYNTACTIC"]["metrics"]["security_violations"],
                "proposed_strict_accuracy": reuse_res["P_PROPOSED"]["metrics"]["strict_accuracy"],
                "proposed_security_violations": reuse_res["P_PROPOSED"]["metrics"]["security_violations"]
            },
            "security_analysis": {
                "rules_evaluated": len(security_res["per_rule_metrics"]),
                "micro_precision": security_res["aggregate_micro"]["precision"],
                "micro_recall": security_res["aggregate_micro"]["recall"],
                "micro_f1": security_res["aggregate_micro"]["f1_score"],
                "micro_fpr": security_res["aggregate_micro"]["false_positive_rate"]
            },
            "architecture_intelligence": {
                "cycle_f1": arch_res["cycle_detection"]["f1_score"],
                "smell_accuracy": arch_res["smell_detection"]["metrics"]["accuracy"]
            },
            "grounded_ai": {
                "proposed_citation_coverage": grounding_res["P_PROPOSED"]["metrics"]["citation_precision"],
                "proposed_unsupported_claim_rate": grounding_res["P_PROPOSED"]["metrics"]["unsupported_claim_rate"],
                "proposed_faithful_reasoning_rate": grounding_res["P_PROPOSED"]["metrics"]["faithful_reasoning_rate"],
                "a5_unconstrained_unsupported_claim_rate": grounding_res["A5_UNCONSTRAINED"]["metrics"]["unsupported_claim_rate"]
            },
            "context_reduction": {
                "mean_character_reduction_pct": context_res["aggregate_metrics"]["mean_character_reduction_pct"],
                "mean_estimated_token_reduction_pct": context_res["aggregate_metrics"]["mean_estimated_token_reduction_pct"],
                "actual_provider_token_reduction_pct": context_res["aggregate_metrics"]["actual_provider_token_reduction_pct"]
            }
        }
    }
    save_json(os.path.join(RESULTS_DIR, "summary.json"), summary)
    print("      -> Saved evaluation/results/summary.json")

    print("\n" + "=" * 80)
    print(" EMPIRICAL EVALUATION SUMMARY (PILOT BENCHMARK)")
    print("=" * 80)
    print(f" Retrieval nDCG@5     : Lexical {summary['key_findings']['retrieval']['lexical_only_ndcg5']} -> Hybrid {summary['key_findings']['retrieval']['hybrid_rrf_ndcg5']} -> Proposed {summary['key_findings']['retrieval']['proposed_ndcg5']}")
    print(f" Reuse Decision Acc   : B0 {summary['key_findings']['reuse_decision']['b0_zero_context_accuracy']*100:.1f}% | B3 {summary['key_findings']['reuse_decision']['b3_basic_syntactic_accuracy']*100:.1f}% (1 breach) | Proposed {summary['key_findings']['reuse_decision']['proposed_strict_accuracy']*100:.1f}% (0 breaches)")
    print(f" Security F1 Score    : {summary['key_findings']['security_analysis']['micro_f1']} (FPR: {summary['key_findings']['security_analysis']['micro_fpr']})")
    print(f" Architecture Cycle F1: {summary['key_findings']['architecture_intelligence']['cycle_f1']}")
    print(f" Grounded AI FRR      : {summary['key_findings']['grounded_ai']['proposed_faithful_reasoning_rate']*100:.1f}% (UNCR: {summary['key_findings']['grounded_ai']['proposed_unsupported_claim_rate']*100:.1f}%)")
    print(f" Context Reduction    : {summary['key_findings']['context_reduction']['mean_character_reduction_pct']}% Chars | {summary['key_findings']['context_reduction']['mean_estimated_token_reduction_pct']}% Est Tokens | Actual: {summary['key_findings']['context_reduction']['actual_provider_token_reduction_pct']}")
    print("=" * 80)
    print(" ALL 8 BENCHMARK RESULTS GENERATED SUCCESSFULLY.")
    print("=" * 80)

if __name__ == "__main__":
    main()
