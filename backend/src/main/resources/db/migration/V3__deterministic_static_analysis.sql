-- =============================================================================
-- CodeMind AI - Database Migration V3
-- Deterministic Static Analysis Engine Schema:
-- Analysis Runs, Symbols, Relationships, Metrics, Quality Findings, Secret Findings
-- Compatible with PostgreSQL 16 and H2 (PostgreSQL mode)
-- =============================================================================

CREATE TABLE IF NOT EXISTS analysis_runs (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    files_analyzed INT DEFAULT 0,
    files_skipped INT DEFAULT 0,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    total_loc BIGINT DEFAULT 0,
    total_classes INT DEFAULT 0,
    total_methods INT DEFAULT 0,
    average_complexity DOUBLE PRECISION DEFAULT 0.0,
    maintainability_index DOUBLE PRECISION DEFAULT 0.0,
    failure_reason VARCHAR(1000),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_analysis_runs_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS symbols (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    fqn VARCHAR(1000),
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL,
    parent_symbol_id UUID,
    start_line INT,
    end_line INT,
    visibility VARCHAR(50),
    is_static BOOLEAN DEFAULT FALSE,
    is_final BOOLEAN DEFAULT FALSE,
    is_abstract BOOLEAN DEFAULT FALSE,
    signature VARCHAR(1000),
    return_type VARCHAR(255),
    parameter_count INT DEFAULT 0,
    CONSTRAINT fk_symbols_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_symbols_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    source_symbol_id UUID,
    target_symbol_id UUID,
    source_fqn VARCHAR(1000),
    target_fqn VARCHAR(1000),
    relationship_type VARCHAR(50) NOT NULL,
    confidence VARCHAR(50) NOT NULL DEFAULT 'RESOLVED',
    line_number INT,
    CONSTRAINT fk_rel_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_rel_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS file_metrics (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    loc INT NOT NULL DEFAULT 0,
    lloc INT NOT NULL DEFAULT 0,
    cyclomatic_complexity INT NOT NULL DEFAULT 0,
    class_count INT NOT NULL DEFAULT 0,
    method_count INT NOT NULL DEFAULT 0,
    halstead_volume DOUBLE PRECISION DEFAULT 0.0,
    maintainability_index DOUBLE PRECISION DEFAULT 0.0,
    CONSTRAINT fk_file_metrics_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_file_metrics_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS symbol_metrics (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    symbol_id UUID NOT NULL,
    loc INT NOT NULL DEFAULT 0,
    cyclomatic_complexity INT NOT NULL DEFAULT 1,
    nesting_depth INT NOT NULL DEFAULT 0,
    parameter_count INT NOT NULL DEFAULT 0,
    halstead_volume DOUBLE PRECISION DEFAULT 0.0,
    maintainability_index DOUBLE PRECISION DEFAULT 0.0,
    CONSTRAINT fk_sym_metrics_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sym_metrics_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_sym_metrics_symbol FOREIGN KEY (symbol_id) REFERENCES symbols(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS quality_findings (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    symbol_id UUID,
    rule_id VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    line_number INT,
    evidence VARCHAR(1000),
    CONSTRAINT fk_qf_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_qf_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS secret_findings (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    rule_id VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    confidence VARCHAR(50) NOT NULL,
    line_number INT,
    redacted_evidence VARCHAR(500) NOT NULL,
    CONSTRAINT fk_sf_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sf_analysis FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_analysis_runs_repo_id ON analysis_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_symbols_analysis_id ON symbols(analysis_id);
CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
CREATE INDEX IF NOT EXISTS idx_symbols_fqn ON symbols(fqn);
CREATE INDEX IF NOT EXISTS idx_relationships_analysis_id ON relationships(analysis_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_file_metrics_analysis_id ON file_metrics(analysis_id);
CREATE INDEX IF NOT EXISTS idx_quality_findings_analysis_id ON quality_findings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_quality_findings_rule_id ON quality_findings(rule_id);
CREATE INDEX IF NOT EXISTS idx_secret_findings_analysis_id ON secret_findings(analysis_id);
