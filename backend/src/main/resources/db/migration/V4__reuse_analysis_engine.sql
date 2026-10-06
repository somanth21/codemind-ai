-- =============================================================================
-- CodeMind AI - Database Migration V4
-- Deterministic Reuse-First Engine Schema:
-- Reuse Analyses, Candidates, and Evidence Provenance
-- Compatible with PostgreSQL 16 and H2 (PostgreSQL mode)
-- =============================================================================

CREATE TABLE IF NOT EXISTS reuse_analyses (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    query VARCHAR(500) NOT NULL,
    decision VARCHAR(50) NOT NULL,
    overall_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    security_status VARCHAR(50) NOT NULL DEFAULT 'SAFE',
    explanation TEXT NOT NULL,
    reasons TEXT,
    config_version VARCHAR(50) NOT NULL DEFAULT 'v1.0',
    weights_json VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reuse_analyses_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_reuse_analyses_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reuse_candidates (
    id UUID PRIMARY KEY,
    reuse_analysis_id UUID NOT NULL,
    symbol_id UUID,
    file_path VARCHAR(1000) NOT NULL,
    symbol_name VARCHAR(255) NOT NULL,
    symbol_kind VARCHAR(50) NOT NULL,
    signature VARCHAR(1000),
    start_line INT NOT NULL,
    end_line INT NOT NULL,
    candidate_type VARCHAR(50) NOT NULL,
    overall_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    functional_relevance DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    structural_similarity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    maintainability_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    complexity_penalty DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    security_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    modification_effort DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    dependency_impact DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    duplication_risk DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    security_gate VARCHAR(50) NOT NULL DEFAULT 'SAFE',
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_reuse_cand_analysis FOREIGN KEY (reuse_analysis_id) REFERENCES reuse_analyses(id) ON DELETE CASCADE,
    CONSTRAINT fk_reuse_cand_symbol FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reuse_evidence (
    id UUID PRIMARY KEY,
    candidate_id UUID NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    source_file VARCHAR(1000),
    start_line INT,
    end_line INT,
    metric_value DOUBLE PRECISION,
    CONSTRAINT fk_reuse_ev_candidate FOREIGN KEY (candidate_id) REFERENCES reuse_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reuse_analyses_repo_id ON reuse_analyses(repository_id);
CREATE INDEX IF NOT EXISTS idx_reuse_analyses_analysis_id ON reuse_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_reuse_candidates_analysis_id ON reuse_candidates(reuse_analysis_id);
CREATE INDEX IF NOT EXISTS idx_reuse_candidates_symbol_id ON reuse_candidates(symbol_id);
CREATE INDEX IF NOT EXISTS idx_reuse_evidence_candidate_id ON reuse_evidence(candidate_id);
