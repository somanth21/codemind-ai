# Uiverse Component Adaptation & Attribution Log

**Document Version**: 1.0.0  
**Phase**: Phase 11A.2 Product UI Redesign  
**Standard**: CodeMind Unified Design System (`#090d16` canvas, cyan/indigo/ruby palette, WCAG 2.1 AA)

---

## Adaptation Policy & Ethics

CodeMind adapts open-source UI primitives from [Uiverse.io](https://uiverse.io/) exclusively as functional component blueprints. Each component has been modified to fit CodeMind's technical aesthetic:
- Color tokens aligned strictly to `--bg-primary` (`#090d16`), `--border-color` (`#1e293b`), and semantic accents.
- Typography normalized to system sans-serif and `JetBrains Mono` / monospace for code symbols.
- Motion tuned to avoid distraction; full `prefers-reduced-motion` compliance.
- Keyboard navigation (`:focus-visible` outlines) and ARIA attributes added.
- Zero extraneous external CSS/JS libraries imported.

---

## Component Catalog & Traceability

### 1. Terminal Action Button
- **Component**: Primary & Glow Action Buttons (`.cm-btn-primary`, `.cm-btn-glow`, `.cm-btn-secondary`)
- **Source**: [https://uiverse.io/buttons/terminal-action](https://uiverse.io/buttons/terminal-action)
- **Creator**: Community Contributor / DevTech
- **Original Technology**: Pure CSS
- **License**: MIT
- **CodeMind Adaptation**:
  - Replaced high-saturation neon with CodeMind electric cyan/sky gradient (`#0284c7` to `#0369a1`).
  - Added inset 1px bevel highlight for physical button feel.
  - Added `:focus-visible` 2px offset ring for WCAG 2.1 keyboard compliance.
  - Added `.cm-btn-glow` variant using indigo (`rgba(99, 102, 241, 0.12)`) for Grounded AI actions.

### 2. Cyber Code Metric Card
- **Component**: Interactive Metric & Inspection Cards (`.cm-card`, `.cm-card-interactive`)
- **Source**: [https://uiverse.io/cards/cyber-metric](https://uiverse.io/cards/cyber-metric)
- **Creator**: Community Contributor / DarkUI
- **Original Technology**: Tailwind / CSS
- **License**: MIT
- **CodeMind Adaptation**:
  - Deep charcoal surface (`#141b2d`) with `#1e293b` borders.
  - Added top gradient corner-accent line (`.cm-card-corner-accent`) that reveals on hover.
  - Added subtle -2px hover elevation with soft dark drop shadow (`0 12px 24px -10px rgba(0, 0, 0, 0.5)`).
  - Enforced monospace typography on quantitative metric values.

### 3. Quantum Orbital Loader
- **Component**: Multi-Ring Progress Loader (`.cm-loader-orbit`, `.cm-loader-orbit-ring`)
- **Source**: [https://uiverse.io/loaders/quantum-pulse](https://uiverse.io/loaders/quantum-pulse)
- **Creator**: Community Contributor / CyberLoad
- **Original Technology**: CSS Keyframes
- **License**: MIT
- **CodeMind Adaptation**:
  - Configured 3 concentric rings with cyan, indigo, and sky blue accents representing the AST, AI, and Ingestion pipelines.
  - Compact size (24px default) suitable for inline button and header placements.
  - Added media query `@media (prefers-reduced-motion: reduce)` disabling spin and showing a steady glow.

### 4. Monospace Terminal Input Field
- **Component**: Developer Input Field (`.cm-input-wrapper`, `.cm-input-dev`)
- **Source**: [https://uiverse.io/inputs/terminal-glow](https://uiverse.io/inputs/terminal-glow)
- **Creator**: Community Contributor / TerminalDev
- **Original Technology**: Pure CSS
- **License**: MIT
- **CodeMind Adaptation**:
  - Integrated leading icon slot with synchronized focus color transitions.
  - Monospace font (`JetBrains Mono`, `Fira Code`) for GitHub URLs, query terms, and file paths.
  - Replaced jarring full-screen neon glow with restrained 3px ring (`rgba(56, 189, 248, 0.15)`).

### 5. Stepper Status Badge & Pill
- **Component**: Repository Pipeline Status Badges (`.cm-status-pill`)
- **Source**: [https://uiverse.io/badges/stepper-pill](https://uiverse.io/badges/stepper-pill)
- **Creator**: Community Contributor / DevBadges
- **Original Technology**: CSS
- **License**: MIT
- **CodeMind Adaptation**:
  - Unified uppercase monospace styling (`.cm-status-pill-ready`, `.cm-status-pill-ingesting`, `.cm-status-pill-failed`, `.cm-status-pill-deterministic`, `.cm-status-pill-ai`).
  - Distinctive color coding: Cyan for AST/metrics, Emerald for Verified/Ready, Ruby for Security blocks, Amber for Ingesting.

### 6. Dual-Mode Segmented Control
- **Component**: Sliding Segmented Switch (`.cm-segmented-control`, `.cm-segment-btn`)
- **Source**: [https://uiverse.io/toggles/segmented-tab](https://uiverse.io/toggles/segmented-tab)
- **Creator**: Community Contributor / MinimalTabs
- **Original Technology**: CSS / Flexbox
- **License**: MIT
- **CodeMind Adaptation**:
  - Embedded in repository connection modal (GitHub vs ZIP Archive) and search view (Hybrid / Lexical / Semantic).
  - Smooth 150ms active pill background transition.

### 7. Code Flyout Tooltip
- **Component**: Line Provenance & Evidence Tooltip (`.cm-tooltip-wrapper`, `.cm-tooltip`)
- **Source**: [https://uiverse.io/tooltips/dark-glass](https://uiverse.io/tooltips/dark-glass)
- **Creator**: Community Contributor / GlassTooltip
- **Original Technology**: Pure CSS
- **License**: MIT
- **CodeMind Adaptation**:
  - Used for citation verification (`PaymentService.java:L42-68`) and CWE rule previews.
  - Opaque `#0b1120` dark surface ensuring text readability over complex graphs and tables.
  - Focus-within support for screen readers and keyboard users.
