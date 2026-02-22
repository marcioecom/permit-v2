-- +migrate Up
ALTER TABLE project_users
ADD COLUMN IF NOT EXISTS last_auth_provider TEXT,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- +migrate Down
ALTER TABLE project_users
DROP COLUMN IF EXISTS last_auth_provider,
DROP COLUMN IF EXISTS login_count;
