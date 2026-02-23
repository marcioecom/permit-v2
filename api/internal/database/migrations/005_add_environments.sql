-- +migrate Up

-- 1. Create environments table
CREATE TABLE environments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    allowed_origins TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_project_env_type UNIQUE (project_id, type)
);

CREATE INDEX idx_environments_project ON environments(project_id);

CREATE TRIGGER update_environments_modtime
    BEFORE UPDATE ON environments
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Create a default "development" environment for each existing project
INSERT INTO environments (id, project_id, name, type, allowed_origins, created_at, updated_at)
SELECT
    'env_' || id,
    id,
    'Development',
    'development',
    COALESCE(allowed_origins, '{}'),
    created_at,
    updated_at
FROM projects;

-- 3. Add environment_id to project_users
ALTER TABLE project_users ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE project_users SET environment_id = 'env_' || project_id;
ALTER TABLE project_users ALTER COLUMN environment_id SET NOT NULL;
ALTER TABLE project_users DROP CONSTRAINT uq_project_user;
ALTER TABLE project_users ADD CONSTRAINT uq_env_user UNIQUE (user_id, environment_id);

-- 4. Add environment_id to identities
ALTER TABLE identities ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE identities i SET environment_id = (
    SELECT e.id FROM environments e
    JOIN project_users pu ON pu.project_id = e.project_id AND e.type = 'development'
    WHERE pu.user_id = i.user_id
    LIMIT 1
);
-- Fallback: assign orphan identities to the first environment of any project
UPDATE identities SET environment_id = (
    SELECT id FROM environments ORDER BY created_at ASC LIMIT 1
) WHERE environment_id IS NULL;

-- 5. Add environment_id to refresh_tokens
ALTER TABLE refresh_tokens ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE refresh_tokens SET environment_id = 'env_' || project_id;
ALTER TABLE refresh_tokens ALTER COLUMN environment_id SET NOT NULL;

-- 6. Add environment_id to otp_codes
ALTER TABLE otp_codes ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE otp_codes SET environment_id = 'env_' || project_id;
ALTER TABLE otp_codes ALTER COLUMN environment_id SET NOT NULL;

-- 7. Add environment_id to auth_logs
ALTER TABLE auth_logs ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE auth_logs SET environment_id = 'env_' || project_id;

-- 8. Add environment_id to project_api_keys
ALTER TABLE project_api_keys ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE project_api_keys SET environment_id = 'env_' || project_id;
ALTER TABLE project_api_keys ALTER COLUMN environment_id SET NOT NULL;

-- 9. Add environment_id to widgets
ALTER TABLE widgets ADD COLUMN environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE;
UPDATE widgets SET environment_id = 'env_' || project_id;

-- +migrate Down
ALTER TABLE widgets DROP COLUMN IF EXISTS environment_id;
ALTER TABLE project_api_keys DROP COLUMN IF EXISTS environment_id;
ALTER TABLE auth_logs DROP COLUMN IF EXISTS environment_id;
ALTER TABLE otp_codes DROP COLUMN IF EXISTS environment_id;
ALTER TABLE refresh_tokens DROP COLUMN IF EXISTS environment_id;
ALTER TABLE identities DROP CONSTRAINT IF EXISTS uq_user_provider_env;
ALTER TABLE identities ADD CONSTRAINT uq_user_provider UNIQUE (user_id, provider);
ALTER TABLE identities DROP COLUMN IF EXISTS environment_id;
ALTER TABLE project_users DROP CONSTRAINT IF EXISTS uq_env_user;
ALTER TABLE project_users ADD CONSTRAINT uq_project_user UNIQUE (user_id, project_id);
ALTER TABLE project_users DROP COLUMN IF EXISTS environment_id;
DROP TRIGGER IF EXISTS update_environments_modtime ON environments;
DROP TABLE IF EXISTS environments;
