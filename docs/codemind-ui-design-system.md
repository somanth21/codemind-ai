# CodeMind AI — UI Design System Specification
## Premium Developer-Tool Aesthetic & Interface Design (Phase 11A)

**Document Version**: 1.0.0  
**Design Philosophy**: "Code-First, High Information Density, Zero Generic Fluff"  
**Classification**: Developer IDE & Engineering Intelligence Platform  

---

## 1. Visual Direction & Aesthetic Core

CodeMind AI rejects the generic white administrative dashboard template in favor of an **AI coding workspace and developer IDE aesthetic**. The interface is engineered for developers who spend their days in editors like VS Code, JetBrains IDEs, and terminal environments.

### Core Principles
1. **Dark-First Precision**: Deep near-black background (`#090d16`) with high-contrast foreground text (`#f1f5f9`), avoiding high-glare white panels.
2. **Authoritative Separation**: Crisp visual boundaries separating **deterministic ground truth** (teal/cyan badges, code line links) from **probabilistic AI reasoning** (violet/indigo subtle glows).
3. **Monospace Hierarchy**: Strict use of monospace typography (`JetBrains Mono`, `Fira Code`, `ui-monospace`) for symbols, packages, signatures, file paths, and metrics.
4. **Information Density**: Compact padding, collapsible inspection drawers, and side-by-side split panels that maximize visible evidence without requiring excessive scrolling.
5. **Restrained Atmosphere**: Subtle border glows (`rgba(59, 130, 246, 0.15)`), zero decorative gradient splashes, and accessible contrast ratios compliant with WCAG 2.1 AA.

---

## 2. Color Palette & Theming Tokens

```css
:root {
  /* Surfaces */
  --cm-surface-canvas:      #090d16;  /* Deep near-black background */
  --cm-surface-subtle:      #0e1322;  /* Top navbar & sidebar */
  --cm-surface-card:        #141b2d;  /* Interactive panels & inspector cards */
  --cm-surface-overlay:     #1a233a;  /* Elevated modals, tooltips, drawers */
  --cm-surface-code:        #06080f;  /* Monospace snippet blocks */

  /* Borders & Dividers */
  --cm-border-subtle:       #1e293b;  /* Inactive dividers */
  --cm-border-prominent:    #334155;  /* Active card boundaries */
  --cm-border-focused:      #3b82f6;  /* Keyboard focus outlines */

  /* Typography */
  --cm-text-primary:        #f8fafc;  /* Primary headlines & code symbols */
  --cm-text-secondary:      #94a3b8;  /* Body descriptions & metadata */
  --cm-text-muted:          #64748b;  /* Inactive timestamps & hints */
  --cm-text-code:           #e2e8f0;  /* Monospace code tokens */

  /* Deterministic Accents (Authoritative) */
  --cm-accent-deterministic:#06b6d4;  /* Cyan: AST facts, symbols, metrics */
  --cm-accent-safe:         #10b981;  /* Emerald: Passed security invariant */
  --cm-accent-warning:      #f59e0b;  /* Amber: High coupling / complex */
  --cm-accent-danger:       #ef4444;  /* Ruby: Blocked security findings */

  /* AI Interpretation Accents (Speculative) */
  --cm-accent-ai-primary:   #6366f1;  /* Indigo: Grounded reasoning */
  --cm-accent-ai-glow:      rgba(99, 102, 241, 0.12); /* Subtle reasoning card glow */
}
```

---

## 3. Global Application Shell

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [CM] CodeMind AI  │  Repo: [spring-petclinic ▼]  │  Status: [● Index Ready] │ User: dev@.. │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ NAVIGATION    │ WORKSPACE / CURRENT MODULE                                  │
│               │                                                             │
│ ⊞ Overview    │ [Active Query / Search Input Bar]                          │
│ 📁 Explorer    │                                                             │
│ 🔍 Search      │ ┌───────────────────────────┐ ┌───────────────────────────┐ │
│ ⚙ Analysis    │ │ DETERMINISTIC EVIDENCE    │ │ AI INTERPRETATION         │ │
│ ⑂ Reuse       │ │                           │ │                           │ │
│ 🛡 Security    │ │ • E1: VetController.java  │ │ Based on cited evidence   │ │
│ 🕸 Architecture│ │ • E2: OwnerService.java   │ │ E1 and E2, the direct     │ │
│ ✦ AI Workspace│ │                           │ │ reuse policy applies...   │ │
│               │ └───────────────────────────┘ └───────────────────────────┘ │
│               │                                                             │
│ Core v1.0     │ [Status: 100% Citation Coverage | Safety Gate: SAFE]        │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

---

## 4. Component Design Patterns

### 4.1 Authoritative Evidence Badges
- Every evidence chunk must render an authoritative anchor pill:
  ```html
  <span class="evidence-pill" data-evidence-id="EV-001">
    <span class="pill-dot"></span>
    <span class="pill-id">E1</span>
    <span class="pill-file">VetController.java:L42-L89</span>
  </span>
  ```
- Clicking an evidence badge immediately expands the raw code snippet and lines without reloading the page.

### 4.2 Security Gating Callout
- The UI must make the security gate's authority unequivocal:
  - If `BLOCKED`: Deep red banner with shield alert icon: `"REUSE BLOCKED: Hard security invariant violated (SEC-CMD-001). Direct reuse prohibited."`
  - If `SAFE`: Subtle green outline: `"SECURITY INVARIANT VERIFIED: 0 blocking vulnerabilities detected."`

### 4.3 AI Speculative Reasoning Panel
- The AI interpretation box must explicitly declare:
  - **Banner**: `"AI SYNTHESIS — GROUNDED ON DETERMINISTIC EVIDENCE"`
  - **Citation verification footer**: `"All claims verified against 3 deterministic evidence chunks."`

---

## 5. Intentional Interaction States

| State | Visual Treatment | Example Message / Behavior |
| :--- | :--- | :--- |
| **LOADING** | Pulsing slate skeleton rows | Monospace shimmer placeholders for symbols and scores. |
| **EMPTY** | Centered icon with actionable button | *"No active repository selected. Ingest an archive or choose from the dropdown."* |
| **UNANALYZED** | Warning badge with trigger CTA | *"Repository ingested but AST index not built. Click 'Trigger Analysis' to start."* |
| **AI UNAVAILABLE**| Amber border alert | *"Grounded reasoning model unreachable. Deterministic repository evidence remains fully functional."* |
| **ERROR (401)** | Red banner with relogin link | *"Session expired. Re-authenticate to access repository assets."* |
| **ERROR (404)** | Resource missing card | *"Repository not found or access unauthorized under multi-tenant isolation."* |

---

## 6. Accessibility & Keyboard Navigation

- **Command Palette**: `Ctrl + K` or `Cmd + K` opens the quick repository navigation and search dialog.
- **Focus Rings**: High-visibility cyan focus outlines (`2px solid var(--cm-accent-deterministic)`) on all interactive inputs.
- **Color Independence**: Status indicators never rely on color alone; always pair colors with icons (`CheckCircle`, `AlertTriangle`, `ShieldAlert`) and explicit text labels (`SAFE`, `BLOCKED`).
- **Contrast Ratios**: Body text achieves $\ge 7:1$ contrast ratio on canvas surfaces, well exceeding the WCAG AA requirement ($4.5:1$).

---

## 7. Uiverse Component Normalization & Design Rules (Phase 11A.2)

To preserve a cohesive developer platform identity while integrating open-source community primitives from [Uiverse.io](https://uiverse.io/):

1. **Color Token Alignment**: All imported CSS components must discard external palettes and map exclusively to `--bg-primary` (`#090d16`), `--bg-secondary` (`#0e1322`), `--border-color` (`#1e293b`), and `--accent-blue`/`--accent-cyan`.
2. **Monospace Discipline**: Quantitative values (file counts, LOC, complexity), branch names, repository URLs, and citations must use `JetBrains Mono` / `Fira Code`.
3. **Restrained Animation**: No continuous looping animations across static dashboard views. Restrict motion to active state indicators (orbital loader during ingestion or AI reasoning) and ensure `@media (prefers-reduced-motion: reduce)` rules are respected.
4. **Attribution & Provenance**: Every component directly inspired or adapted from Uiverse must be cataloged in [`docs/uiverse-components.md`](docs/uiverse-components.md) with source link, creator attribution, and adaptation details.

