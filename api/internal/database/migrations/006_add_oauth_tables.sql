-- +migrate Up

CREATE TABLE oauth_provider_configs (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    client_id TEXT,
    client_secret_encrypted TEXT,
    scopes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_env_provider UNIQUE (environment_id, provider)
);

CREATE INDEX idx_oauth_configs_env ON oauth_provider_configs(environment_id);

CREATE TRIGGER update_oauth_configs_modtime
    BEFORE UPDATE ON oauth_provider_configs
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TABLE oauth_states (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    state TEXT NOT NULL UNIQUE,
    redirect_url TEXT NOT NULL,
    client_origin TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);

CREATE TABLE oauth_authorization_codes (
    id TEXT PRIMARY KEY,
    environment_id TEXT NOT NULL REFERENCES environments(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_auth_codes_code ON oauth_authorization_codes(code);

-- +migrate Down
DROP TABLE IF EXISTS oauth_authorization_codes;
DROP TABLE IF EXISTS oauth_states;
DROP TABLE IF EXISTS oauth_provider_configs;
