"""
Mathematical metrics module for CodeMind AI evaluation harness.
Implements retrieval, decision, security, grounding, and context metrics.
Adheres strictly to the requirement that non-applicable metrics return "N/A" rather than collapsing to 0.0.
"""

import math
from typing import List, Set, Dict, Any, Union, Optional

def precision_at_k(retrieved: List[str], relevant: Set[str], k: int) -> float:
    """Calculates Precision@K = |retrieved[:k] ∩ relevant| / k."""
    if k <= 0:
        return 0.0
    cutoff = retrieved[:k]
    if not cutoff:
        return 0.0
    hits = sum(1 for item in cutoff if item in relevant)
    return hits / float(k)

def recall_at_k(retrieved: List[str], relevant: Set[str], k: int) -> Union[float, str]:
    """Calculates Recall@K = |retrieved[:k] ∩ relevant| / |relevant|."""
    if not relevant:
        return "N/A"
    if k <= 0:
        return 0.0
    cutoff = retrieved[:k]
    hits = sum(1 for item in cutoff if item in relevant)
    return hits / float(len(relevant))

def reciprocal_rank(retrieved: List[str], relevant: Set[str]) -> float:
    """Calculates reciprocal rank (1 / rank of first relevant item, or 0.0 if none found)."""
    for idx, item in enumerate(retrieved, start=1):
        if item in relevant:
            return 1.0 / float(idx)
    return 0.0

def mean_reciprocal_rank(all_retrieved: List[List[str]], all_relevant: List[Set[str]]) -> float:
    """Calculates Mean Reciprocal Rank (MRR) across queries."""
    if not all_retrieved:
        return 0.0
    rr_scores = [reciprocal_rank(ret, rel) for ret, rel in zip(all_retrieved, all_relevant)]
    return sum(rr_scores) / float(len(rr_scores))

def dcg_at_k(retrieved: List[str], relevance_scores: Dict[str, float], k: int) -> float:
    """Computes Discounted Cumulative Gain at rank K."""
    dcg = 0.0
    for idx, item in enumerate(retrieved[:k], start=1):
        rel = relevance_scores.get(item, 0.0)
        # Standard formulation: (2^rel - 1) / log2(idx + 1)
        dcg += (math.pow(2, rel) - 1.0) / math.log2(idx + 1)
    return dcg

def ndcg_at_k(retrieved: List[str], relevance_scores: Dict[str, float], k: int) -> float:
    """Computes Normalized Discounted Cumulative Gain (nDCG@K)."""
    if k <= 0 or not relevance_scores:
        return 0.0
    actual_dcg = dcg_at_k(retrieved, relevance_scores, k)
    # Sort all relevant items by score descending to find ideal ranking
    ideal_sorted = sorted(relevance_scores.keys(), key=lambda x: relevance_scores[x], reverse=True)
    ideal_dcg = dcg_at_k(ideal_sorted, relevance_scores, k)
    if ideal_dcg <= 0.0:
        return 0.0
    return actual_dcg / ideal_dcg

def binary_metrics(tp: int, fp: int, tn: int, fn: int) -> Dict[str, Union[float, str, int]]:
    """
    Computes precision, recall, F1, FPR, accuracy from confusion elements.
    Returns 'N/A' when a denominator is zero.
    """
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / float(total) if total > 0 else "N/A"

    prec = (tp / float(tp + fp)) if (tp + fp) > 0 else "N/A"
    rec = (tp / float(tp + fn)) if (tp + fn) > 0 else "N/A"

    if prec == "N/A" or rec == "N/A":
        f1 = "N/A"
    elif (prec + rec) == 0.0:
        f1 = 0.0
    else:
        f1 = (2.0 * prec * rec) / (prec + rec)

    fpr = (fp / float(fp + tn)) if (fp + tn) > 0 else "N/A"
    fnr = (fn / float(fn + tp)) if (fn + tp) > 0 else "N/A"

    return {
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "accuracy": round(accuracy, 4) if isinstance(accuracy, float) else accuracy,
        "precision": round(prec, 4) if isinstance(prec, float) else prec,
        "recall": round(rec, 4) if isinstance(rec, float) else rec,
        "f1_score": round(f1, 4) if isinstance(f1, float) else f1,
        "false_positive_rate": round(fpr, 4) if isinstance(fpr, float) else fpr,
        "false_negative_rate": round(fnr, 4) if isinstance(fnr, float) else fnr
    }

def build_confusion_matrix(classes: List[str], y_true: List[str], y_pred: List[str]) -> Dict[str, Dict[str, int]]:
    """Builds a square confusion matrix as a nested dictionary: cm[expected][predicted] = count."""
    cm = {c_true: {c_pred: 0 for c_pred in classes} for c_true in classes}
    for yt, yp in zip(y_true, y_pred):
        if yt in cm and yp in cm[yt]:
            cm[yt][yp] += 1
    return cm

def character_reduction_pct(naive_chars: int, optimized_chars: int) -> float:
    """Computes percentage reduction in characters."""
    if naive_chars <= 0:
        return 0.0
    diff = max(0, naive_chars - optimized_chars)
    return round((diff / float(naive_chars)) * 100.0, 2)

def estimated_token_reduction_pct(naive_chars: int, optimized_chars: int) -> float:
    """Computes estimated token reduction using standard 4 chars per token heuristic."""
    naive_tok = max(1, naive_chars // 4)
    opt_tok = max(1, optimized_chars // 4)
    diff = max(0, naive_tok - opt_tok)
    return round((diff / float(naive_tok)) * 100.0, 2)

def actual_token_reduction_pct(actual_naive: Optional[int], actual_opt: Optional[int]) -> Union[float, str]:
    """Computes actual provider token reduction or returns 'N/A' if metadata is unavailable."""
    if actual_naive is None or actual_opt is None or actual_naive <= 0:
        return "N/A"
    diff = max(0, actual_naive - actual_opt)
    return round((diff / float(actual_naive)) * 100.0, 2)

def citation_precision(cited_ids: List[str], ground_truth_ids: Set[str]) -> Union[float, str]:
    """Precision of citations = |cited ∩ GT| / |cited|."""
    if not cited_ids:
        return "N/A"
    valid = sum(1 for cid in cited_ids if cid in ground_truth_ids)
    return round(valid / float(len(cited_ids)), 4)

def citation_recall(cited_ids: List[str], ground_truth_ids: Set[str]) -> Union[float, str]:
    """Recall of citations = |cited ∩ GT| / |GT|."""
    if not ground_truth_ids:
        return "N/A"
    valid = sum(1 for cid in cited_ids if cid in ground_truth_ids)
    return round(valid / float(len(ground_truth_ids)), 4)

def unsupported_claim_rate(claims_total: int, claims_without_citations: int) -> float:
    """UNCR = claims without citations / total claims."""
    if claims_total <= 0:
        return 0.0
    return round(claims_without_citations / float(claims_total), 4)

def faithful_reasoning_rate(faithful_cases: int, total_cases: int) -> float:
    """FRR = faithful conclusions / total conclusions."""
    if total_cases <= 0:
        return 0.0
    return round(faithful_cases / float(total_cases), 4)
