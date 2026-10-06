# CodeMind AI — Future Minimality Layer Integration Point
## Architectural Boundary, Input/Output Contracts & Pipeline Placement

**Document Version**: 1.0.0  
**Phase**: Pre-Phase 11A Architecture Boundary Definition  
**Classification**: Research Pipeline Specification  
**Status**: APPROVED DESIGN SPECIFICATION (Implementation deferred to Phase 11)  

---

## 1. Research Context & Purpose

The **CodeMind Minimality Layer** is a planned architectural capability designed to maximize context efficiency and eliminate redundant reasoning tokens when presenting repository evidence to the Grounded AI reasoning layer. 

> [!IMPORTANT]
> **Strict Non-Duplication Policy**:  
> This document defines a CodeMind-native minimality architecture. It does NOT integrate, copy, or download source code from external packages (such as Ponytail). External tools serve purely as conceptual motivation.

---

## 2. Pipeline Integration Placement

The Minimality Layer sits **after** all deterministic analytical engines and **before** the Grounded AI LLM invocation.

```
                  User Request / Query
                           ↓
             [Phase 4: Hybrid RRF Retrieval]
                           ↓
             [Phase 5: 8D Reuse Decision Engine]
                           ↓
             [Phase 7: Deterministic Security Gating]
                           ↓
             [Phase 7: Architecture Context & Cycles]
                           ↓
    ┌──────────────────────────────────────────────────┐
    │     FUTURE CODEMIND MINIMALITY LAYER             │
    │                                                  │
    │  • Deduplication of overlapping symbol spans     │
    │  • AST-guided snippet distillation               │
    │  • Dependency tree pruning                       │
    │  • Minimal sufficient evidence set synthesis     │
    └──────────────────────────────────────────────────┘
                           ↓
           Bounded Minimal Evidence Chunks
                           ↓
       [Phase 6: Grounded AI Reasoning Layer]
                           ↓
       Cited Developer Explanation & Recommendation
```

---

## 3. Input & Output Contracts

### 3.1 Input Data Specification
The Minimality Layer receives the raw, unpruned evidence candidates produced by upstream engines:

```json
{
  "query": "String token splitting utility",
  "repository_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "reuse_decision": "REUSE_DIRECTLY",
  "security_gate": "SAFE",
  "candidates": [
    {
      "candidate_id": "cand-001",
      "symbol_name": "StringUtils.splitTokens",
      "file_path": "fixtures/ReuseFixtures.java",
      "full_method_body": "...",
      "line_start": 42,
      "line_end": 85,
      "dependencies": ["StringUtils.isEmpty", "CharUtils.isWhitespace"]
    }
  ],
  "architecture_context": {
    "package": "com.codemind.util",
    "has_cycle": false
  }
}
```

### 3.2 Output Data Specification
The Minimality Layer emits the **minimal sufficient evidence representation** required for the LLM to verify and explain the decision without receiving unnecessary token bloat:

```json
{
  "minimality_applied": true,
  "original_character_count": 14250,
  "distilled_character_count": 680,
  "token_compression_ratio": 20.95,
  "pruned_evidence_chunks": [
    {
      "evidence_id": "MIN-EV-001",
      "target_symbol": "StringUtils.splitTokens",
      "distilled_signature": "public static List<String> splitTokens(String, String)",
      "essential_lines": [42, 43, 44, 45, 60],
      "redacted_inner_spans": "lines 46-59 omitted for brevity (pure iteration logic)"
    }
  ]
}
```

---

## 4. API & Frontend Integration Boundaries

1. **Backend Integration Point**:
   - `AiReasoningService.java` will invoke `MinimalityEngine.distill(evidenceList)` immediately prior to populating the prompt template.
   - If the Minimality Layer is toggled off (e.g. for ablation benchmarks), the system transparently falls back to current bounded evidence selection without failing.
2. **REST API Exposure**:
   - `AiReasoningDto` will incorporate a new `MinimalitySummaryDto` object exposing `compressionRatio`, `originalBytes`, and `distilledBytes`.
3. **Frontend Display Location**:
   - In [`AiInsightsPage.tsx`](file:///c:/Users/soman/Desktop/Act%20Mini/frontend/src/pages/AiInsightsPage.tsx), the evidence viewer drawer will render a **"Minimality Metrics"** pill showing developers exactly how many tokens were saved through AST-guided distillation.

---

## 5. Security & Verification Invariants

- **Zero Information Leakage**: The minimality distillation algorithm must never discard security-relevant attributes (annotations, visibility, or tainted parameter boundaries).
- **Hard Gate Authority**: Even if the Minimality Layer aggressively prunes a snippet, it can **never** unblock a candidate marked `BLOCKED` by `ReuseSecurityGate`.
