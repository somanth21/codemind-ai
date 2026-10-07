# CodeMind AI — Uiverse Component Adaptations & Design System Reference

This document tracks all UI components adopted from [Uiverse.io](https://uiverse.io/) into the CodeMind AI product experience, preserving open-source attribution, creator credits, and documenting adaptations made to fit CodeMind's dark developer workspace design system (`#070A12` / `#0D1220`).

---

## 1. Terminal Action Buttons (`.cm-btn`, `.cm-btn-primary`, `.cm-btn-secondary`, `.cm-btn-glow`)
* **Uiverse URL**: `https://uiverse.io/e-alvarez/great-termite-38` (and `https://uiverse.io/satyamchaudharydev/modern-button-54`)
* **Component Name**: Elevated Terminal Button / Modern Gradient Pill
* **Creator**: `e-alvarez` & `satyamchaudharydev`
* **Original Technology**: Pure CSS & CSS Transitions
* **Where Used in CodeMind**:
  - Global navigation CTAs (`Navbar.tsx`, `LandingPage.tsx`)
  - Form actions (`LoginPage.tsx`, `RegisterPage.tsx`, `ConnectRepositoryModal.tsx`)
  - Dashboard workflow triggers (`DashboardPage.tsx`)
* **Modifications Made**:
  - Re-themed colors to CodeMind deep cyan/blue (`#0284c7`, `#0369a1`, `#38bdf8`) with subtle linear gradients and border highlights.
  - Reduced animation duration to 150–200ms with snappy `cubic-bezier(0.16, 1, 0.3, 1)` easing.
  - Added accessible keyboard focus rings (`:focus-visible`).

---

## 2. Cyber Metric Cards (`.cm-card`, `.cm-card-interactive`, `.cm-card-corner-accent`)
* **Uiverse URL**: `https://uiverse.io/vinodjangid07/brave-swan-31`
* **Component Name**: Glass Cyber Card with Gradient Border Flare
* **Creator**: `vinodjangid07`
* **Original Technology**: CSS Flexbox & Pseudo-elements
* **Where Used in CodeMind**:
  - Top KPI Metric Cards on `DashboardPage.tsx` (LOC, Symbols, MI, Security findings)
  - Research Pipeline Stage Nodes
  - Authentication Card Wrappers (`LoginPage.tsx`, `RegisterPage.tsx`)
  - Grounded AI reasoning panels (`AiInsightsPage.tsx`, `AiExplanationPanel.tsx`)
* **Modifications Made**:
  - Replaced high-opacity neon gradients with restrained 1px `#1D2638` / `rgba(255,255,255,0.07)` borders and `#0D1220` surface background.
  - Added subtle cyan top-border flare on hover (`.cm-card-corner-accent`) without excessive glow.
  - Constrained card heights to 110–140px for compact data density.

---

## 3. Quantum Orbital Loader (`.cm-loader-orbit`, `.cm-loader-orbit-ring`)
* **Uiverse URL**: `https://uiverse.io/fedeperin/quantum-orbit-loader`
* **Component Name**: Multi-axis Orbital Spinner
* **Creator**: `fedeperin`
* **Original Technology**: CSS 3D Keyframe Animations
* **Where Used in CodeMind**:
  - Form submitting spinners (`LoginPage.tsx`, `RegisterPage.tsx`)
  - Modal ingestion pipeline indicators (`ConnectRepositoryModal.tsx`)
* **Modifications Made**:
  - Scaled down from 80px to 16px/24px inline badges.
  - Colored rings using CodeMind palette (cyan `#06b6d4`, indigo `#6366f1`, blue `#38bdf8`).
  - Added `prefers-reduced-motion` fallbacks to respect user accessibility settings.

---

## 4. Monospace Terminal Input (`.cm-input-dev`, `.cm-input-wrapper`)
* **Uiverse URL**: `https://uiverse.io/Yaya12085/cyber-terminal-input`
* **Component Name**: Glowing Developer Input
* **Creator**: `Yaya12085`
* **Original Technology**: CSS Form Styling
* **Where Used in CodeMind**:
  - Authentication forms (`LoginPage.tsx`, `RegisterPage.tsx`)
  - Command palette search trigger (`Navbar.tsx`)
  - Repository URL input (`ConnectRepositoryModal.tsx`)
  - Symbol query search (`RepositorySearchView.tsx`)
* **Modifications Made**:
  - Toned down bright neon border to dark slate `#1e293b` with `#38bdf8` focus ring and 3px soft shadow.
  - Integrated `lucide-react` icon slot with dynamic icon color transitions on focus.
  - Set monospace/system typography hierarchy for code precision.

---

## 5. Stepper Status Badges & Pills (`.cm-status-pill-*`)
* **Uiverse URL**: `https://uiverse.io/Gaurav-Rana-pytest/minimal-pill-badge`
* **Component Name**: Status Indicator Tag
* **Creator**: `Gaurav-Rana-pytest`
* **Original Technology**: CSS Pill Badges
* **Where Used in CodeMind**:
  - Sidebar AI / Admin tags (`Sidebar.tsx`)
  - Repository status flags (READY / INGESTING / FAILED)
  - Research invariant indicator ("DETERMINISTIC FIRST", "VERIFIED CITATION")
* **Modifications Made**:
  - Standardized font family to `JetBrains Mono` / monospace.
  - Coded semantic colorways: Emerald (`#10b981`), Amber (`#f59e0b`), Ruby (`#ef4444`), Cyan (`#06b6d4`), and Indigo (`#6366f1`).
  - Subtle translucent backgrounds (`rgba(..., 0.12)`) and 1px crisp borders.

---

## 6. Dual-Mode Segmented Control (`.cm-segmented-control`, `.cm-segment-btn`)
* **Uiverse URL**: `https://uiverse.io/alexruix/segmented-pill-tabs`
* **Component Name**: Dark Segmented Switcher
* **Creator**: `alexruix`
* **Original Technology**: CSS Flex Tabs
* **Where Used in CodeMind**:
  - Repository Ingestion modal tab switcher (GitHub Primary vs Upload ZIP)
  - Search view filter mode switcher (Hybrid / Lexical / Semantic)
* **Modifications Made**:
  - Refined to Linear/Raycast style dark background (`#0e1322`) with inset padding.
  - Smooth active tab background transitions.

---

## 7. Glass Command Palette & Flyout Tooltips (`.cm-tooltip`, `.cm-command-bar`)
* **Uiverse URL**: `https://uiverse.io/Pradeepshelke/dark-glass-tooltip`
* **Component Name**: Floating Glass Flyout
* **Creator**: `Pradeepshelke`
* **Original Technology**: CSS Tooltips
* **Where Used in CodeMind**:
  - Top navigation bar Command Palette (Ctrl+K trigger)
  - Citation evidence hover badges
* **Modifications Made**:
  - Monospace font rendering for evidence code line-range previews.
  - `#0b1120` solid surface with `rgba(255,255,255,0.07)` border and soft backdrop blur.
