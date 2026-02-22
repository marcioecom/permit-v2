CREATE TABLE IF NOT EXISTS auth_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT,
    user_email TEXT NOT NULL,
    event_type TEXT NOT NULL,
    status TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_project ON auth_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_user ON auth_logs(user_email, created_at DESC);
