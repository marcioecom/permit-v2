-- +migrate Up
CREATE TABLE identities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    provider_user_id TEXT,
    email TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX idx_identities_user ON identities(user_id);
CREATE INDEX idx_identities_provider_email ON identities(provider, email);

ALTER TABLE projects ADD COLUMN IF NOT EXISTS allowed_providers TEXT[] DEFAULT ARRAY['email'];

-- +migrate Down
DROP TABLE IF EXISTS identities;
ALTER TABLE projects DROP COLUMN IF EXISTS allowed_providers;
