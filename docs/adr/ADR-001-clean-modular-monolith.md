# ADR-001: Clean Modular Monolith Architecture

## Status
Accepted

## Context
CodeMind AI is an academic and research-oriented software repository understanding and engineering assistant. The system requires multiple distinct domain capabilities: user authentication, repository ingestion, AST parsing, metric calculation, retrieval indexing, multi-criteria reuse evaluation, static security analysis, architecture intelligence, and grounded LLM reasoning.

During initial architectural planning, we evaluated whether to implement the backend as microservices or as a unified modular monolith.

## Decision
We chose a **Clean Modular Monolith** implemented in Java 17 and Spring Boot 3.3.4, accompanied by a React 18 + Vite + TypeScript Single Page Application (SPA).

The modular monolith is structured into strict package boundaries (`com.codemind.domain`, `ingestion`, `analyzer`, `indexer`, `reuse`, `security.analysis`, `architecture`, `ai`, `web`). Communication between modules occurs via well-defined internal Java service contracts and domain entities within a single JVM process.

## Alternatives Considered
1. **Microservices Architecture**:
   - Decomposing the system into separate services (e.g., Ingestion Service, Parser Service, Search Service, AI Service, Auth Service).
   - *Rejected*: Incurred severe operational complexity (network latency between stages, distributed transactions, Docker container orchestration overhead, complex local developer setup) with zero functional benefit for the research goals.
2. **Polyglot Microservices (Python + Java)**:
   - Writing AST parsing in Java and AI/search in Python.
   - *Rejected*: Fragmentation of language runtimes, complicated deployment, and inter-process serialization bottlenecks for large AST models.

## Consequences
### Positive:
- Simplified deployment: Self-contained executable JAR running on standard Java 17 runtimes.
- Zero network serialization overhead between parsing, metric evaluation, reuse scoring, and evidence selection.
- Atomic ACID transactions across repository metadata, analysis runs, and findings.
- High developer productivity: Single build file (`pom.xml`) with self-contained Maven Wrapper.

### Negative / Trade-offs:
- Modules share JVM heap memory; resource-heavy operations (e.g., large AST traversal) must be bounded to prevent CPU starvation.
- Horizontal scaling scales the entire monolith rather than individual pipeline components.

## Security Implications
- In-memory data passing reduces network exposure of sensitive repository metadata.
- Boundary enforcement is maintained through Java package-private visibility and Spring Security role-based access control rather than perimeter network firewalls.
