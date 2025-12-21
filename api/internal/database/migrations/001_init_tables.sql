-- +migrate Up
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id TEXT PRIMARY KEY, -- ULID
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

CREATE TABLE projects (
    id TEXT PRIMARY KEY, -- ULID
    owner_id TEXT NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    allowed_origins TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE project_users (
    user_id TEXT NOT NULL REFERENCES users(id),
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    last_login TIMESTAMPTZ,
    blocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_project_user UNIQUE (user_id, project_id)
);

CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_project_users_project ON project_users(project_id);

-- 4. PROJECT_API_KEYS
CREATE TABLE project_api_keys (
    id TEXT PRIMARY KEY, -- ULID
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT,
    client_id TEXT NOT NULL UNIQUE,
    client_secret_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE widgets (
    project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Welcome',
    subtitle TEXT,
    theme_config JSONB DEFAULT '{}'::jsonb,
    enabled_providers TEXT[],
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE otp_codes (
    id TEXT PRIMARY KEY, -- ULID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_lookup ON otp_codes(user_id, project_id, code);


CREATE TABLE refresh_tokens (
    id TEXT PRIMARY KEY, -- ULID
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_token_lookup ON refresh_tokens(token_hash);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_widgets_modtime BEFORE UPDATE ON widgets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- +migrate Down
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS otp_codes;
DROP TABLE IF EXISTS widgets;
DROP TABLE IF EXISTS project_api_keys;
DROP TABLE IF EXISTS project_users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP FUNCTION IF EXISTS update_updated_at_column();

