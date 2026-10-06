-- =============================================================================
-- CodeMind AI - Database Migration V6
-- Deterministic Security Analysis & Architecture Intelligence Schema:
-- Security Analyses, Security Findings, and Architecture Analyses (Metrics, Graphs, Cycles)
-- Compatible with PostgreSQL 16 and H2 (PostgreSQL mode)
-- =============================================================================

CREATE TABLE IF NOT EXISTS security_analyses (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    total_findings INT NOT NULL DEFAULT 0,
    critical_count INT NOT NULL DEFAULT 0,
    high_count INT NOT NULL DEFAULT 0,
    medium_count INT NOT NULL DEFAULT 0,
    low_count INT NOT NULL DEFAULT 0,
    info_count INT NOT NULL DEFAULT 0,
    risk_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sec_analyses_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sec_analyses_run FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS security_findings (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    security_analysis_id UUID,
    rule_id VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    remediation TEXT NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    symbol_id UUID,
    start_line INT,
    end_line INT,
    evidence_snippet TEXT,
    confidence VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sec_findings_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_sec_findings_run FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE,
    CONSTRAINT fk_sec_findings_analysis FOREIGN KEY (security_analysis_id) REFERENCES security_analyses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS architecture_analyses (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    analysis_id UUID NOT NULL,
    package_count INT NOT NULL DEFAULT 0,
    class_count INT NOT NULL DEFAULT 0,
    interface_count INT NOT NULL DEFAULT 0,
    dependency_count INT NOT NULL DEFAULT 0,
    cycle_count INT NOT NULL DEFAULT 0,
    hotspot_count INT NOT NULL DEFAULT 0,
    smell_count INT NOT NULL DEFAULT 0,
    average_complexity DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    average_maintainability DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    package_stats_json TEXT NOT NULL,
    cycles_json TEXT NOT NULL,
    hotspots_json TEXT NOT NULL,
    smells_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    graph_json TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_arch_analyses_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_arch_analyses_run FOREIGN KEY (analysis_id) REFERENCES analysis_runs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sec_analyses_repo ON security_analyses(repository_id);
CREATE INDEX IF NOT EXISTS idx_sec_analyses_run ON security_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_repo ON security_findings(repository_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_run ON security_findings(analysis_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_sec_analysis ON security_findings(security_analysis_id);
CREATE INDEX IF NOT EXISTS idx_sec_findings_severity ON security_findings(severity);
CREATE INDEX IF NOT EXISTS idx_sec_findings_category ON security_findings(category);
CREATE INDEX IF NOT EXISTS idx_sec_findings_status ON security_findings(status);

CREATE INDEX IF NOT EXISTS idx_arch_analyses_repo ON architecture_analyses(repository_id);
CREATE INDEX IF NOT EXISTS idx_arch_analyses_run ON architecture_analyses(analysis_id);
CREATE INDEX IF NOT EXISTS idx_arch_analyses_created_at ON architecture_analyses(created_at);
