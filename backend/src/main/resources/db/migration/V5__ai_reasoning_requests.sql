-- =============================================================================
-- CodeMind AI - Database Migration V5
-- Grounded AI Reasoning Layer Schema:
-- AI Reasoning Requests, Token Accounting, and Cited Explanations
-- Compatible with PostgreSQL 16 and H2 (PostgreSQL mode)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_reasoning_requests (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    reuse_analysis_id UUID,
    user_id UUID NOT NULL,
    request_type VARCHAR(50) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    evidence_count INT NOT NULL DEFAULT 0,
    context_chars INT NOT NULL DEFAULT 0,
    context_truncated BOOLEAN NOT NULL DEFAULT FALSE,
    prompt_tokens INT,
    completion_tokens INT,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    decision VARCHAR(50),
    summary TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ai_requests_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_requests_reuse FOREIGN KEY (reuse_analysis_id) REFERENCES reuse_analyses(id) ON DELETE SET NULL,
    CONSTRAINT fk_ai_requests_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ai_requests_repo_id ON ai_reasoning_requests(repository_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_reuse_id ON ai_reasoning_requests(reuse_analysis_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_user_id ON ai_reasoning_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_created_at ON ai_reasoning_requests(created_at);
