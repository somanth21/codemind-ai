# ADR-002: PostgreSQL 16 with pgvector Persistence Tier and H2 Development Fallback

## Status
Accepted

## Context
CodeMind AI requires persistent storage for structured relational entities (users, repositories, audit logs, AST symbols, relationships, file metrics, quality findings, reuse decisions) as well as dense vector embeddings for semantic code search.

The system needs a production-grade relational database that supports vector similarity search while also supporting frictionless standalone development and fast automated test execution without external service dependencies.

## Decision
We selected **PostgreSQL 16 with the `pgvector` extension** as the primary production database target, supplemented by an embedded **H2 in-memory database** configured in PostgreSQL compatibility mode for developer workflow and test suites.

Flyway manages unified schema migrations (`V1` through `V6`).

## Alternatives Considered
1. **Dedicated Vector Database (Pinecone, Milvus, Qdrant) + Separate Relational DB**:
   - Splitting relational entities into PostgreSQL and vector embeddings into a separate vector database.
   - *Rejected*: Creates distributed data consistency challenges (e.g., synchronizing candidate symbol deletion with vector deletions), requires managing two database infrastructure services, and increases operational burden.
2. **Pure Document Store (MongoDB)**:
   - Storing all repository models as JSON documents.
   - *Rejected*: Inefficient relational querying across foreign-keyed symbol hierarchies, lack of native vector operations in standard open-source editions, and weak transactional guarantees for multi-tenant audit logs.
3. **Pure In-Memory / SQLite Database**:
   - *Rejected*: Inadequate for production vector indexing and lacked concurrent write scaling.

## Consequences
### Positive:
- **Unified ACID Consistency**: Relational symbols, quality findings, and vector embeddings reside in the same database engine, allowing transactional joins and cascading deletes (`ON DELETE CASCADE`).
- **Zero-Dependency Dev / Test Experience**: Developers and CI pipelines run `./mvnw test` immediately with H2 in PostgreSQL mode without needing Docker or a local PostgreSQL instance.
- **Production Scalability**: `pgvector` provides indexed similarity search ($L_2$ distance, inner product, cosine distance) leveraging PostgreSQL's mature query planner.

### Negative / Trade-offs:
- Advanced pgvector indexes (HNSW, IVFFlat) require active PostgreSQL instances and cannot be fully exercised within the H2 test fallback.
- Test suites must maintain queries and Flyway SQL syntax compatible with both PostgreSQL and H2.

## Security Implications
- Multi-tenant data isolation is enforced at the relational layer using foreign-key constraints on `repository_id` and parameterized queries preventing SQL injection.
- Redacted secret findings and audit logs reside within the access-controlled PostgreSQL database perimeter.
