"""
Unit tests for CodeMind AI Phase 10 Evaluation Harness.
Verifies metric formulas, edge cases, zero-division N/A handling, and provenance stamping.
"""

import unittest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from metrics import (
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
    mean_reciprocal_rank,
    dcg_at_k,
    ndcg_at_k,
    binary_metrics,
    build_confusion_matrix,
    character_reduction_pct,
    estimated_token_reduction_pct,
    actual_token_reduction_pct,
    citation_precision,
    citation_recall,
    unsupported_claim_rate,
    faithful_reasoning_rate
)
from provenance import stamp_provenance, get_git_commit

class TestEvaluationMetrics(unittest.TestCase):

    def test_precision_at_k(self):
        retrieved = ["A", "B", "C", "D", "E"]
        relevant = {"A", "C", "F"}
        self.assertAlmostEqual(precision_at_k(retrieved, relevant, 1), 1.0)
        self.assertAlmostEqual(precision_at_k(retrieved, relevant, 2), 0.5)
        self.assertAlmostEqual(precision_at_k(retrieved, relevant, 5), 0.4)
        self.assertEqual(precision_at_k(retrieved, relevant, 0), 0.0)

    def test_recall_at_k(self):
        retrieved = ["A", "B", "C", "D", "E"]
        relevant = {"A", "C", "F"}
        # 2 out of 3 relevant items retrieved in top 5
        self.assertAlmostEqual(recall_at_k(retrieved, relevant, 5), 2.0 / 3.0)
        # Empty relevant set must return "N/A"
        self.assertEqual(recall_at_k(retrieved, set(), 5), "N/A")

    def test_reciprocal_rank(self):
        self.assertAlmostEqual(reciprocal_rank(["A", "B", "C"], {"A"}), 1.0)
        self.assertAlmostEqual(reciprocal_rank(["B", "A", "C"], {"A"}), 0.5)
        self.assertAlmostEqual(reciprocal_rank(["B", "C", "A"], {"A"}), 1.0 / 3.0)
        self.assertEqual(reciprocal_rank(["B", "C", "D"], {"A"}), 0.0)

    def test_mean_reciprocal_rank(self):
        retrieved = [["A", "B"], ["B", "A"], ["C", "D"]]
        relevant = [{"A"}, {"A"}, {"A"}]
        # RRs: 1.0, 0.5, 0.0 -> average = 0.5
        self.assertAlmostEqual(mean_reciprocal_rank(retrieved, relevant), 0.5)

    def test_ndcg_at_k(self):
        scores = {"A": 3.0, "B": 2.0, "C": 1.0}
        perfect = ["A", "B", "C"]
        self.assertAlmostEqual(ndcg_at_k(perfect, scores, 3), 1.0)

        inverted = ["C", "B", "A"]
        ndcg_val = ndcg_at_k(inverted, scores, 3)
        self.assertTrue(0.0 < ndcg_val < 1.0)

        # Non-applicable / empty
        self.assertEqual(ndcg_at_k([], {}, 5), 0.0)

    def test_binary_metrics_normal(self):
        res = binary_metrics(tp=8, fp=2, tn=8, fn=2)
        self.assertEqual(res["true_positives"], 8)
        self.assertEqual(res["false_positives"], 2)
        self.assertAlmostEqual(res["precision"], 0.8)
        self.assertAlmostEqual(res["recall"], 0.8)
        self.assertAlmostEqual(res["f1_score"], 0.8)
        self.assertAlmostEqual(res["false_positive_rate"], 0.2)
        self.assertAlmostEqual(res["accuracy"], 0.8)

    def test_binary_metrics_na_handling(self):
        # 0 TPs and 0 FPs -> Precision must be "N/A", NOT 0.0!
        res = binary_metrics(tp=0, fp=0, tn=5, fn=0)
        self.assertEqual(res["precision"], "N/A")
        self.assertEqual(res["recall"], "N/A")
        self.assertEqual(res["f1_score"], "N/A")
        self.assertEqual(res["false_positive_rate"], 0.0)

    def test_confusion_matrix_structure(self):
        classes = ["C1", "C2", "C3"]
        y_true = ["C1", "C1", "C2", "C3"]
        y_pred = ["C1", "C2", "C2", "C3"]
        cm = build_confusion_matrix(classes, y_true, y_pred)
        self.assertEqual(cm["C1"]["C1"], 1)
        self.assertEqual(cm["C1"]["C2"], 1)
        self.assertEqual(cm["C2"]["C2"], 1)
        self.assertEqual(cm["C3"]["C3"], 1)
        self.assertEqual(cm["C3"]["C1"], 0)

    def test_context_reduction(self):
        # 1000 naive chars down to 200 bounded chars -> 80% reduction
        self.assertAlmostEqual(character_reduction_pct(1000, 200), 80.0)
        self.assertAlmostEqual(estimated_token_reduction_pct(1000, 200), 80.0)
        # Actual tokens unavailable must return "N/A"
        self.assertEqual(actual_token_reduction_pct(None, None), "N/A")
        self.assertEqual(actual_token_reduction_pct(100, None), "N/A")

    def test_grounding_metrics(self):
        cited = ["EV-1", "EV-2", "EV-FAKE"]
        gt = {"EV-1", "EV-2"}
        self.assertAlmostEqual(citation_precision(cited, gt), 2.0 / 3.0, places=3)
        self.assertAlmostEqual(citation_recall(cited, gt), 1.0)
        self.assertEqual(citation_precision([], gt), "N/A")
        self.assertEqual(citation_recall(cited, set()), "N/A")
        self.assertAlmostEqual(unsupported_claim_rate(10, 2), 0.2)
        self.assertAlmostEqual(faithful_reasoning_rate(8, 10), 0.8)

    def test_provenance_stamping(self):
        prov = stamp_provenance(case_id="TEST-001", system_configuration="P_PROPOSED")
        self.assertEqual(prov["case_id"], "TEST-001")
        self.assertEqual(prov["system_configuration"], "P_PROPOSED")
        self.assertEqual(prov["dataset_version"], "1.0.0")
        self.assertEqual(prov["metric_definition_version"], "1.0.0")
        self.assertTrue(len(prov["git_commit"]) > 0)
        self.assertTrue("T" in prov["timestamp"])

if __name__ == "__main__":
    unittest.main()
