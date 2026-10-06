# Deterministic Architecture Intelligence

CodeMind AI provides an automated, deterministic architecture analysis suite that extracts architectural structures, coupling metrics, cyclic dependency chains, hotspots, and design smells from the repository's deterministic static analysis AST model.

---

## 1. Principles & Deterministic Authority

1. **Deterministic Authority**: All package coupling metrics, cycle graphs, hotspot degrees, and design smell classifications are computed using formal graph algorithms and mathematical formulations.
2. **Zero Runtime Execution**: The architecture graph is derived from AST symbol dependencies (`extends`, `implements`, field references, method signatures, return types, and parameter declarations) without compiling or running repository code.
3. **Provable Cycle Detection**: Circular dependencies are discovered using Depth-First Search (DFS) / Tarjan cycle enumeration with canonical minimum-rotation deduplication, guaranteeing reproducibility.
4. **LLM Consumption**: Architecture hotspots and cycle chains are fed into the Phase 6 Grounded LLM reasoning pipeline as structured `EvidenceChunk`s with exact file and line provenance.

---

## 2. Package Coupling Metrics (Robert C. Martin)

The system measures package stability and maintainability using standard object-oriented design metrics:

- **Afferent Coupling ($C_a$)**: The number of external packages that depend on classes inside this package (incoming callers / fan-in). Indicates package responsibility.
- **Efferent Coupling ($C_e$)**: The number of external packages that classes inside this package depend upon (outgoing dependencies / fan-out). Indicates package dependence.
- **Instability ($I$)**:
  $$I = \frac{C_e}{C_a + C_e}$$
  - $I = 0.0$: Maximally stable package (relied upon by others, does not depend on externals).
  - $I = 1.0$: Maximally unstable package (relies heavily on external packages, no incoming dependents).
  - Division by zero guard: When $C_a + C_e = 0$, $I = 0.0$ and category is marked `ISOLATED`.

### Package Categories
- **`BALANCED`**: Moderate afferent and efferent coupling ($0.3 \le I \le 0.7$).
- **`CENTRAL`**: High incoming dependents ($C_a \ge 3, I \le 0.3$), highly stable core abstraction.
- **`DEPENDENCY_HEAVY`**: High outgoing dependents ($C_e \ge 5, I \ge 0.7$), client orchestration package.
- **`HIGHLY_COUPLED`**: Excessive total coupling ($C_a + C_e \ge 6$).
- **`ISOLATED`**: Zero external dependencies and zero incoming callers.

---

## 3. Dependency Cycle Detection

Circular dependencies violate the **Acyclic Dependencies Principle (ADP)** and create tightly coupled ripples where changes in one class force recompilation and testing across the entire cycle loop.

### Algorithm
1. Construct directed dependency graph $G = (V, E)$ where vertices are classes or packages.
2. Run cycle discovery using recursive DFS with active recursion stack tracking.
3. For each detected cycle:
   - Identify closed cycle loop: $v_1 \to v_2 \to \dots \to v_k \to v_1$.
   - Normalize cycle via **canonical rotation** (shift array so lexicographically smallest vertex is at index 0).
   - Deduplicate against known cycle signatures.
4. Classify severity:
   - 2-node cycle: `HIGH` severity.
   - 3-5 node cycle: `HIGH` severity.
   - >5 node cycle: `CRITICAL` severity (architectural tangle).

---

## 4. Architectural Hotspots & Design Smells

### Hotspots
Identifies structural bottlenecks based on graph degree metrics:
- **`HUB`**: High fan-in AND high fan-out (total degree $\ge 6$), acting as a central routing nexus.
- **`HIGH_FAN_OUT`**: Heavy outgoing dependencies ($C_e \ge 6$), vulnerable to changes in external modules.
- **`CORE_ABSTRACTION`**: High fan-in ($C_a \ge 5$) with minimal fan-out ($C_e \le 1$), critical system core.

### Design Smells
- **`CYCLIC_DEPENDENCY`**: Presence of package or class cycles violating modularity.
- **`GOD_PACKAGE`**: Single package containing $\ge 15$ classes or excessive coupling.
- **`UNSTABLE_ABSTRACTION`**: Package containing abstract classes or interfaces with high instability ($I > 0.7$).

---

## 5. Interactive Visual Graph

The frontend provides an interactive SVG dependency graph viewer:
- Circular layout algorithm with force-directed spacing.
- Real-time symbol search and type filter (Classes, Interfaces, Packages).
- Zoom in / Zoom out / Zoom reset controls.
- Interactive node inspector displaying afferent/efferent coupling, cycle membership, and connected edges.

---

## 6. REST API Endpoints

- `POST /api/v1/repositories/{repositoryId}/architecture/analyze` — Computes architectural intelligence.
- `GET /api/v1/repositories/{repositoryId}/architecture` — Lists historical architecture analyses (paginated).
- `GET /api/v1/repositories/{repositoryId}/architecture/{analysisId}` — Returns full coupling metrics, cycles, hotspots, and smells.
- `GET /api/v1/repositories/{repositoryId}/architecture/{analysisId}/graph` — Returns nodes, edges, and cycles optimized for graph rendering.
