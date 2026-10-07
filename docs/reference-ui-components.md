# CodeMind AI — Tactile Reference UI Component Architecture

## 1. Overview & Reference Origin

This document defines the tactile, dark-mode design system adapted across CodeMind AI from the tactile reference components located in:
- `ref ui/ui compnents of the app/1.html` & `1.css`
- `ref ui/ui.html` & `ui.css`

The goal of this architectural adaptation is to establish a coherent, high-density, tactile engineering aesthetic throughout the application without altering deterministic backend logic, database schemas, API contracts, or breaking existing test suites.

> [!NOTE]
> Per product specifications, the **Dashboard** (`src/pages/DashboardPage.tsx`) was intentionally excluded from this redesign, preserving its bespoke engineering KPI layout.

---

## 2. Design Tokens & Core CSS Classes

All foundational styles and utilities are centralized in `frontend/src/index.css`.

### 2.1 Atmospheric Canvas & Lighting
- `.cm-canvas-grain`: Fixed viewport overlay rendering a subtle dot-grid pattern with reduced opacity (`0.4`), providing depth behind dark cards.
- `.cm-ambient-glow`: Absolute-positioned blurred gradient bloom (`#38bdf8` to `#818cf8`, filter blur `80px`, opacity `0.5–0.7`) creating localized ambient illumination behind hero headers and focal sections.
- `.cm-ambient-glow-teal`: Complementary ambient bloom (`#14b8a6` to `#06b6d4`) for secondary atmospheric warmth.

### 2.2 Tactile Clay Elevation (`.cm-clay-card`)
Provides a physical, layered elevation distinct from flat cards:
- **Geometry**: `border-radius: 20px`, `padding: 24px`.
- **Surface**: Multi-layer background gradient (`linear-gradient(135deg, rgba(20, 24, 38, 0.95) 0%, rgba(11, 15, 25, 0.98) 100%)`).
- **Highlights**: Top-edge inset highlight `box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09)`.
- **Shadows**: Deep multi-stop drop shadow `0 20px 40px -15px rgba(0, 0, 0, 0.7)`.
- **Border**: Restrained border `1px solid rgba(255, 255, 255, 0.08)`.
- **Interaction**: Spring hover elevation (`transform: translateY(-3px)`, enhanced border highlight).

### 2.3 Eyebrow Typography (`.cm-eyebrow`)
- Monospace uppercase label (`font-size: 0.68rem`, `letter-spacing: 0.12em`, `font-weight: 700`, `color: #06b6d4`).
- Preceded by a `12px` cyan horizontal rule and terminated by a `4px` glowing dot.

### 2.4 Segmented Pill Controls (`.cm-pill-nav` & `.cm-pill-tab`)
- **Container (`.cm-pill-nav`)**: Backdrop-blurred capsule container (`rgba(8, 12, 22, 0.85)`, `border: 1px solid rgba(255, 255, 255, 0.08)`, `border-radius: 999px`, `padding: 4px`).
- **Tabs (`.cm-pill-tab`)**: Smooth pill transitions (`border-radius: 999px`, `font-weight: 600`, `color: #94a3b8`).
- **Active State (`.cm-pill-tab.active`)**: Glowing capsule (`background: linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(14, 165, 233, 0.2) 100%)`, `color: #ffffff`, `box-shadow: 0 2px 8px rgba(6, 182, 212, 0.25)`).

### 2.5 Directional Action Buttons (`.cm-arrow-pill`)
- High-contrast interactive pill (`border-radius: 999px`, `background: #ffffff`, `color: #000000`, `font-weight: 700`).
- Contains `.cm-cta-dot` (pulsing accent indicator) and directional arrow with spring translate animation on hover.

### 2.6 Status & Severity Tags (`.cm-tag-pill`)
Capsule badges with translucent tinted fills, border accents, and colored indicator dots:
- `.cm-tag-pill.cyan`: Static analysis, AST declarations, deterministic indices.
- `.cm-tag-pill.green`: Zero vulnerabilities, healthy metrics, grounded status.
- `.cm-tag-pill.amber`: Warnings, medium/high security severity, partial grounding.
- `.cm-tag-pill.red`: Critical security findings, cycles, zero-tolerance gates.
- `.cm-tag-pill.blue`: Information badges, low severity, interfaces/protocols.

### 2.7 Circular Controls & Icon Tiles
- `.cm-circle-btn`: Circular button for quick actions, close triggers, and search submits.
- `.cm-icon-tile`: Squircle icon holder (`width: 40px`, `height: 40px`, `border-radius: 12px`, inset top highlight).

---

## 3. Component Inventory Across CodeMind AI

| Module / Page | File Path | Adapted Tactile UI Features |
| :--- | :--- | :--- |
| **Global Theme** | `src/index.css` | Canvas grain overlay, ambient glows, clay card elevation, pill navs, arrow pills, tag pills. |
| **Repositories** | `src/pages/RepositoriesPage.tsx` | Ambient hero glow, `.cm-eyebrow`, tactile ingest summary card, `.cm-arrow-pill` connect button, tactile repository table rows. |
| **Connect Modal** | `src/components/repository/ConnectRepositoryModal.tsx` | `.cm-clay-card` modal frame, `.cm-pill-nav` for GitHub / Local upload tabs, `.cm-arrow-pill` connect trigger. |
| **Repository Analysis** | `src/pages/AnalysisPage.tsx` | Ambient glow, `.cm-eyebrow`, `.cm-arrow-pill` Run button, `.cm-pill-nav` snapshot switcher, tactile clay cards for Sections B–F. |
| **Analysis Tabs** | `src/components/analysis/AnalysisDashboard.tsx` | `.cm-pill-nav` tab strip for Overview, Symbols, Files, Findings, Secrets, Reuse, Security, Architecture. |
| **Reuse Advisor** | `src/pages/ReusePage.tsx` & `ReuseAnalysisView.tsx` | Clay hero card with ambient glow, pill input query bar with `.cm-arrow-pill` search, clay candidate recommendation cards with `.cm-tag-pill` metadata. |
| **Architecture 2.0** | `src/components/architecture/ArchitectureAnalysisView.tsx` & `DependencyGraphViewer.tsx` | Ambient glow header with PDF export `.cm-arrow-pill`, `.cm-pill-nav` 13-mode switcher (Overview, Components, Dependencies, Classes, Call Graph, Sequence, Data Flow, Entities, API Map, Security, Cycles, Hotspots, Deployment). |
| **Security Audit** | `src/pages/SecurityPage.tsx` & `SecurityAnalysisView.tsx` | Ambient glow, `.cm-eyebrow`, `.cm-clay-card` KPI cards (Total, Critical, High, Medium, Low, Risk Score), tactile filter bar, clay findings with source evidence terminal and remediation advice. |
| **Grounded AI** | `src/pages/AiInsightsPage.tsx` | Capsule query bar with glowing submit `.cm-arrow-pill`, tactile prompt starter buttons, `.cm-clay-card` executive synthesis, verified provenance cards with lines citation modal. |
| **Repository Search** | `src/pages/SearchPage.tsx` & `RepositorySearchView.tsx` | Capsule search input bar with ⌘K badge, `.cm-pill-nav` mode switcher (Hybrid RRF / Lexical / Semantic), `.cm-clay-card` symbol matches with exact file/line provenance. |

---

## 4. Preservation Invariants & Testing Verification

1. **Dashboard Preservation**: `src/pages/DashboardPage.tsx` remains untouched.
2. **Deterministic Data Integrity**: Zero mocked or synthetic values introduced; all data originates from existing REST APIs (`/api/repositories`, `/api/analysis`, `/api/security`, `/api/reuse`, `/api/ai`).
3. **Accessibility & Test Selectors**: All `data-testid`, ARIA labels, form attributes, and text nodes were strictly maintained.
4. **Automated Verification**: Full Vitest test suite (`npm test -- --run`) verifies that all 18 test suites and 54 unit tests pass with zero regressions.
