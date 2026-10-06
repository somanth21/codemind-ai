-- =============================================================================
-- CodeMind AI - Database Migration V2
-- Secure Repository Ingestion & File Metadata Tracking
-- Compatible with PostgreSQL 16 and H2 (PostgreSQL mode)
-- =============================================================================

ALTER TABLE repositories ADD COLUMN IF NOT EXISTS file_count INT DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS total_size_bytes BIGINT DEFAULT 0;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS storage_dir_name VARCHAR(255);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS ingestion_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS ingestion_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(1000);

CREATE TABLE IF NOT EXISTS repository_files (
    id UUID PRIMARY KEY,
    repository_id UUID NOT NULL,
    relative_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    extension VARCHAR(50),
    language VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
    size_bytes BIGINT NOT NULL DEFAULT 0,
    is_binary BOOLEAN NOT NULL DEFAULT FALSE,
    sha256 VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_repository_files_repo FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_repo_files_repo_id ON repository_files(repository_id);
CREATE INDEX IF NOT EXISTS idx_repo_files_language ON repository_files(language);
CREATE INDEX IF NOT EXISTS idx_repo_files_is_binary ON repository_files(is_binary);
CREATE INDEX IF NOT EXISTS idx_repo_files_rel_path ON repository_files(repository_id, relative_path);
