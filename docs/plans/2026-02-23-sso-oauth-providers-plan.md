# SSO OAuth Providers - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OAuth social login (Google, GitHub) with per-environment isolation and shared dev credentials.

**Architecture:** New `environments` table as sub-resource of projects. All auth-related tables migrate from project-scoped to environment-scoped. OAuth flow goes: SDK -> backend authorize endpoint -> provider -> backend callback -> client sso-callback route -> backend token exchange -> JWT issued.

**Tech Stack:** Go (chi, pgx, jwt), TypeScript (React SDK, Server SDK), Next.js (Dashboard), PostgreSQL

**Design doc:** `docs/plans/2026-02-23-sso-oauth-providers-design.md`

---

## Phase 1: Database Migrations & Models

### Task 1: Create environments table and migrate existing data

**Files:**
- Create: `api/internal/database/migrations/005_add_environments.sql`
- Modify: `api/internal/models/environment.go` (new)

**Step 1: Write the migration SQL**

Create `api/internal/database/migrations/005_add_environments.sql`:

```sql
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
    allowed_origins,
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
-- For identities without a matching project_user, assign to first available env
UPDATE identities SET environment_id = (
    SELECT id FROM environments LIMIT 1
) WHERE environment_id IS NULL;
ALTER TABLE identities DROP CONSTRAINT uq_user_provider;
ALTER TABLE identities ADD CONSTRAINT uq_user_provider_env UNIQUE (user_id, provider, environment_id);

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
DROP TABLE IF EXISTS environments;
```

**Step 2: Create environment model**

Create `api/internal/models/environment.go`:

```go
package models

import "time"

const (
    EnvTypeDevelopment = "development"
    EnvTypeStaging     = "staging"
    EnvTypeProduction  = "production"
)

type Environment struct {
    ID             string    `json:"id"`
    ProjectID      string    `json:"projectId"`
    Name           string    `json:"name"`
    Type           string    `json:"type"`
    AllowedOrigins []string  `json:"allowedOrigins"`
    CreatedAt      time.Time `json:"createdAt"`
    UpdatedAt      time.Time `json:"updatedAt"`
}
```

**Step 3: Run migration to verify it works**

Run: `cd api && go run cmd/migrate/main.go up`
Expected: Migration 005 applied successfully

**Step 4: Commit**

```bash
git add api/internal/database/migrations/005_add_environments.sql api/internal/models/environment.go
git commit -m "feat: add environments table and migrate existing data to environment-scoped"
```

---

### Task 2: Create OAuth tables migration

**Files:**
- Create: `api/internal/database/migrations/006_add_oauth_tables.sql`
- Create: `api/internal/models/oauth.go`

**Step 1: Write the migration SQL**

Create `api/internal/database/migrations/006_add_oauth_tables.sql`:

```sql
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
```

**Step 2: Create OAuth models**

Create `api/internal/models/oauth.go`:

```go
package models

import "time"

const (
    ProviderGoogle = "google"
    ProviderGitHub = "github"
)

type OAuthProviderConfig struct {
    ID                    string   `json:"id"`
    EnvironmentID         string   `json:"environmentId"`
    Provider              string   `json:"provider"`
    Enabled               bool     `json:"enabled"`
    ClientID              *string  `json:"clientId,omitempty"`
    ClientSecretEncrypted *string  `json:"-"`
    Scopes                []string `json:"scopes"`
    CreatedAt             time.Time `json:"createdAt"`
    UpdatedAt             time.Time `json:"updatedAt"`
}

type OAuthState struct {
    ID            string    `json:"id"`
    EnvironmentID string    `json:"environmentId"`
    Provider      string    `json:"provider"`
    State         string    `json:"state"`
    RedirectURL   string    `json:"redirectUrl"`
    ClientOrigin  string    `json:"clientOrigin"`
    ExpiresAt     time.Time `json:"expiresAt"`
    CreatedAt     time.Time `json:"createdAt"`
}

type OAuthAuthorizationCode struct {
    ID            string     `json:"id"`
    EnvironmentID string     `json:"environmentId"`
    UserID        string     `json:"userId"`
    Code          string     `json:"code"`
    Provider      string     `json:"provider"`
    ExpiresAt     time.Time  `json:"expiresAt"`
    UsedAt        *time.Time `json:"usedAt,omitempty"`
    CreatedAt     time.Time  `json:"createdAt"`
}

// Default scopes per provider
var DefaultOAuthScopes = map[string][]string{
    ProviderGoogle: {"openid", "email", "profile"},
    ProviderGitHub: {"user:email", "read:user"},
}

// Provider OAuth endpoints
type OAuthProviderEndpoints struct {
    AuthURL    string
    TokenURL   string
    UserInfoURL string
    EmailURL   string // optional, for GitHub private emails
}

var OAuthEndpoints = map[string]OAuthProviderEndpoints{
    ProviderGoogle: {
        AuthURL:     "https://accounts.google.com/o/oauth2/v2/auth",
        TokenURL:    "https://oauth2.googleapis.com/token",
        UserInfoURL: "https://www.googleapis.com/oauth2/v2/userinfo",
    },
    ProviderGitHub: {
        AuthURL:     "https://github.com/login/oauth/authorize",
        TokenURL:    "https://github.com/login/oauth/access_token",
        UserInfoURL: "https://api.github.com/user",
        EmailURL:    "https://api.github.com/user/emails",
    },
}
```

**Step 3: Run migration**

Run: `cd api && go run cmd/migrate/main.go up`
Expected: Migration 006 applied successfully

**Step 4: Commit**

```bash
git add api/internal/database/migrations/006_add_oauth_tables.sql api/internal/models/oauth.go
git commit -m "feat: add OAuth provider configs, states, and authorization codes tables"
```

---

## Phase 2: Backend - Environment Repository & Service

### Task 3: Create environment repository

**Files:**
- Create: `api/internal/repository/environment_repo.go`

**Step 1: Write the repository interface and implementation**

Create `api/internal/repository/environment_repo.go`:

```go
package repository

import (
    "context"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/marcioecom/permit/internal/models"
)

type EnvironmentRepository interface {
    Create(ctx context.Context, env *models.Environment) error
    GetByID(ctx context.Context, id string) (*models.Environment, error)
    GetByProjectID(ctx context.Context, projectID string) ([]*models.Environment, error)
    GetByProjectAndType(ctx context.Context, projectID, envType string) (*models.Environment, error)
    GetDefaultForProject(ctx context.Context, projectID string) (*models.Environment, error)
    Update(ctx context.Context, env *models.Environment) error
}

type postgresEnvironmentRepo struct {
    db *pgxpool.Pool
}

func NewPostgresEnvironmentRepo(db *pgxpool.Pool) EnvironmentRepository {
    return &postgresEnvironmentRepo{db: db}
}

func (r *postgresEnvironmentRepo) Create(ctx context.Context, env *models.Environment) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO environments (id, project_id, name, type, allowed_origins)
        VALUES ($1, $2, $3, $4, $5)
    `, env.ID, env.ProjectID, env.Name, env.Type, env.AllowedOrigins)
    return err
}

func (r *postgresEnvironmentRepo) GetByID(ctx context.Context, id string) (*models.Environment, error) {
    var env models.Environment
    err := r.db.QueryRow(ctx, `
        SELECT id, project_id, name, type, allowed_origins, created_at, updated_at
        FROM environments WHERE id = $1
    `, id).Scan(&env.ID, &env.ProjectID, &env.Name, &env.Type, &env.AllowedOrigins, &env.CreatedAt, &env.UpdatedAt)
    if err != nil {
        return nil, err
    }
    return &env, nil
}

func (r *postgresEnvironmentRepo) GetByProjectID(ctx context.Context, projectID string) ([]*models.Environment, error) {
    rows, err := r.db.Query(ctx, `
        SELECT id, project_id, name, type, allowed_origins, created_at, updated_at
        FROM environments WHERE project_id = $1 ORDER BY created_at ASC
    `, projectID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var envs []*models.Environment
    for rows.Next() {
        var env models.Environment
        if err := rows.Scan(&env.ID, &env.ProjectID, &env.Name, &env.Type, &env.AllowedOrigins, &env.CreatedAt, &env.UpdatedAt); err != nil {
            return nil, err
        }
        envs = append(envs, &env)
    }
    return envs, nil
}

func (r *postgresEnvironmentRepo) GetByProjectAndType(ctx context.Context, projectID, envType string) (*models.Environment, error) {
    var env models.Environment
    err := r.db.QueryRow(ctx, `
        SELECT id, project_id, name, type, allowed_origins, created_at, updated_at
        FROM environments WHERE project_id = $1 AND type = $2
    `, projectID, envType).Scan(&env.ID, &env.ProjectID, &env.Name, &env.Type, &env.AllowedOrigins, &env.CreatedAt, &env.UpdatedAt)
    if err != nil {
        return nil, err
    }
    return &env, nil
}

func (r *postgresEnvironmentRepo) GetDefaultForProject(ctx context.Context, projectID string) (*models.Environment, error) {
    return r.GetByProjectAndType(ctx, projectID, models.EnvTypeDevelopment)
}

func (r *postgresEnvironmentRepo) Update(ctx context.Context, env *models.Environment) error {
    _, err := r.db.Exec(ctx, `
        UPDATE environments SET name = $1, allowed_origins = $2 WHERE id = $3
    `, env.Name, env.AllowedOrigins, env.ID)
    return err
}
```

**Step 2: Verify it compiles**

Run: `cd api && go build ./...`
Expected: No errors

**Step 3: Commit**

```bash
git add api/internal/repository/environment_repo.go
git commit -m "feat: add environment repository"
```

---

### Task 4: Create OAuth repository

**Files:**
- Create: `api/internal/repository/oauth_repo.go`

**Step 1: Write the OAuth repository**

Create `api/internal/repository/oauth_repo.go`:

```go
package repository

import (
    "context"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/marcioecom/permit/internal/models"
)

type OAuthRepository interface {
    // Provider configs
    GetProviderConfig(ctx context.Context, environmentID, provider string) (*models.OAuthProviderConfig, error)
    ListProviderConfigs(ctx context.Context, environmentID string) ([]*models.OAuthProviderConfig, error)
    UpsertProviderConfig(ctx context.Context, config *models.OAuthProviderConfig) error
    DeleteProviderConfig(ctx context.Context, environmentID, provider string) error

    // OAuth states (CSRF)
    CreateState(ctx context.Context, state *models.OAuthState) error
    GetAndDeleteState(ctx context.Context, stateValue string) (*models.OAuthState, error)
    CleanupExpiredStates(ctx context.Context) error

    // Authorization codes
    CreateAuthorizationCode(ctx context.Context, code *models.OAuthAuthorizationCode) error
    GetAndUseAuthorizationCode(ctx context.Context, codeValue string) (*models.OAuthAuthorizationCode, error)
}

type postgresOAuthRepo struct {
    db *pgxpool.Pool
}

func NewPostgresOAuthRepo(db *pgxpool.Pool) OAuthRepository {
    return &postgresOAuthRepo{db: db}
}

func (r *postgresOAuthRepo) GetProviderConfig(ctx context.Context, environmentID, provider string) (*models.OAuthProviderConfig, error) {
    var cfg models.OAuthProviderConfig
    err := r.db.QueryRow(ctx, `
        SELECT id, environment_id, provider, enabled, client_id, client_secret_encrypted, scopes, created_at, updated_at
        FROM oauth_provider_configs WHERE environment_id = $1 AND provider = $2
    `, environmentID, provider).Scan(
        &cfg.ID, &cfg.EnvironmentID, &cfg.Provider, &cfg.Enabled,
        &cfg.ClientID, &cfg.ClientSecretEncrypted, &cfg.Scopes,
        &cfg.CreatedAt, &cfg.UpdatedAt,
    )
    if err != nil {
        return nil, err
    }
    return &cfg, nil
}

func (r *postgresOAuthRepo) ListProviderConfigs(ctx context.Context, environmentID string) ([]*models.OAuthProviderConfig, error) {
    rows, err := r.db.Query(ctx, `
        SELECT id, environment_id, provider, enabled, client_id, scopes, created_at, updated_at
        FROM oauth_provider_configs WHERE environment_id = $1 ORDER BY provider ASC
    `, environmentID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var configs []*models.OAuthProviderConfig
    for rows.Next() {
        var cfg models.OAuthProviderConfig
        if err := rows.Scan(&cfg.ID, &cfg.EnvironmentID, &cfg.Provider, &cfg.Enabled, &cfg.ClientID, &cfg.Scopes, &cfg.CreatedAt, &cfg.UpdatedAt); err != nil {
            return nil, err
        }
        configs = append(configs, &cfg)
    }
    return configs, nil
}

func (r *postgresOAuthRepo) UpsertProviderConfig(ctx context.Context, config *models.OAuthProviderConfig) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO oauth_provider_configs (id, environment_id, provider, enabled, client_id, client_secret_encrypted, scopes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (environment_id, provider) DO UPDATE SET
            enabled = EXCLUDED.enabled,
            client_id = EXCLUDED.client_id,
            client_secret_encrypted = EXCLUDED.client_secret_encrypted,
            scopes = EXCLUDED.scopes
    `, config.ID, config.EnvironmentID, config.Provider, config.Enabled,
        config.ClientID, config.ClientSecretEncrypted, config.Scopes)
    return err
}

func (r *postgresOAuthRepo) DeleteProviderConfig(ctx context.Context, environmentID, provider string) error {
    _, err := r.db.Exec(ctx, `
        DELETE FROM oauth_provider_configs WHERE environment_id = $1 AND provider = $2
    `, environmentID, provider)
    return err
}

func (r *postgresOAuthRepo) CreateState(ctx context.Context, state *models.OAuthState) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO oauth_states (id, environment_id, provider, state, redirect_url, client_origin, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, state.ID, state.EnvironmentID, state.Provider, state.State, state.RedirectURL, state.ClientOrigin, state.ExpiresAt)
    return err
}

func (r *postgresOAuthRepo) GetAndDeleteState(ctx context.Context, stateValue string) (*models.OAuthState, error) {
    var s models.OAuthState
    err := r.db.QueryRow(ctx, `
        DELETE FROM oauth_states WHERE state = $1 AND expires_at > NOW()
        RETURNING id, environment_id, provider, state, redirect_url, client_origin, expires_at, created_at
    `, stateValue).Scan(&s.ID, &s.EnvironmentID, &s.Provider, &s.State, &s.RedirectURL, &s.ClientOrigin, &s.ExpiresAt, &s.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &s, nil
}

func (r *postgresOAuthRepo) CleanupExpiredStates(ctx context.Context) error {
    _, err := r.db.Exec(ctx, `DELETE FROM oauth_states WHERE expires_at < NOW()`)
    return err
}

func (r *postgresOAuthRepo) CreateAuthorizationCode(ctx context.Context, code *models.OAuthAuthorizationCode) error {
    _, err := r.db.Exec(ctx, `
        INSERT INTO oauth_authorization_codes (id, environment_id, user_id, code, provider, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6)
    `, code.ID, code.EnvironmentID, code.UserID, code.Code, code.Provider, code.ExpiresAt)
    return err
}

func (r *postgresOAuthRepo) GetAndUseAuthorizationCode(ctx context.Context, codeValue string) (*models.OAuthAuthorizationCode, error) {
    var c models.OAuthAuthorizationCode
    err := r.db.QueryRow(ctx, `
        UPDATE oauth_authorization_codes
        SET used_at = NOW()
        WHERE code = $1 AND used_at IS NULL AND expires_at > NOW()
        RETURNING id, environment_id, user_id, code, provider, expires_at, used_at, created_at
    `, codeValue).Scan(&c.ID, &c.EnvironmentID, &c.UserID, &c.Code, &c.Provider, &c.ExpiresAt, &c.UsedAt, &c.CreatedAt)
    if err != nil {
        return nil, err
    }
    return &c, nil
}
```

**Step 2: Verify it compiles**

Run: `cd api && go build ./...`

**Step 3: Commit**

```bash
git add api/internal/repository/oauth_repo.go
git commit -m "feat: add OAuth repository for provider configs, states, and auth codes"
```

---

### Task 5: Add OAuth config to Config struct and shared credentials

**Files:**
- Modify: `api/internal/config/config.go`

**Step 1: Add OAuth fields to Config**

Add to the `Config` struct in `api/internal/config/config.go`:

```go
// Add these fields to Config struct:
OAuthCallbackBaseURL        string
SharedGoogleClientID        string
SharedGoogleClientSecret    string
SharedGitHubClientID        string
SharedGitHubClientSecret    string
```

Add to `Load()` function:

```go
// Add these lines in the Load function:
OAuthCallbackBaseURL:     getEnv("OAUTH_CALLBACK_BASE_URL", "http://localhost:8080"),
SharedGoogleClientID:     os.Getenv("PERMIT_SHARED_GOOGLE_CLIENT_ID"),
SharedGoogleClientSecret: os.Getenv("PERMIT_SHARED_GOOGLE_CLIENT_SECRET"),
SharedGitHubClientID:     os.Getenv("PERMIT_SHARED_GITHUB_CLIENT_ID"),
SharedGitHubClientSecret: os.Getenv("PERMIT_SHARED_GITHUB_CLIENT_SECRET"),
```

**Step 2: Verify it compiles**

Run: `cd api && go build ./...`

**Step 3: Commit**

```bash
git add api/internal/config/config.go
git commit -m "feat: add OAuth shared credentials config"
```

---

## Phase 3: Backend - OAuth Service

### Task 6: Create OAuth service with authorize and callback logic

**Files:**
- Create: `api/internal/service/oauth_service.go`

**Step 1: Write the OAuth service**

Create `api/internal/service/oauth_service.go`:

```go
package service

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "encoding/json"
    "errors"
    "fmt"
    "io"
    "net/http"
    "net/url"
    "strings"
    "time"

    "github.com/jackc/pgx/v5"
    "github.com/marcioecom/permit/internal/config"
    "github.com/marcioecom/permit/internal/crypto"
    "github.com/marcioecom/permit/internal/models"
    "github.com/marcioecom/permit/internal/repository"
    "github.com/oklog/ulid/v2"
    "github.com/rs/zerolog/log"
)

type OAuthService struct {
    cfg          *config.Config
    jwtService   *crypto.JWTService
    oauthRepo    repository.OAuthRepository
    envRepo      repository.EnvironmentRepository
    userRepo     repository.UserRepository
    identityRepo repository.IdentityRepository
    projectRepo  repository.ProjectRepository
    httpClient   *http.Client
}

func NewOAuthService(
    cfg *config.Config,
    jwtService *crypto.JWTService,
    oauthRepo repository.OAuthRepository,
    envRepo repository.EnvironmentRepository,
    userRepo repository.UserRepository,
    identityRepo repository.IdentityRepository,
    projectRepo repository.ProjectRepository,
) *OAuthService {
    return &OAuthService{
        cfg:          cfg,
        jwtService:   jwtService,
        oauthRepo:    oauthRepo,
        envRepo:      envRepo,
        userRepo:     userRepo,
        identityRepo: identityRepo,
        projectRepo:  projectRepo,
        httpClient:   &http.Client{Timeout: 10 * time.Second},
    }
}

type AuthorizeInput struct {
    Provider      string
    EnvironmentID string
    RedirectURL   string // client's callback path, e.g. "/sso-callback"
    ClientOrigin  string // from Origin or Referer header
}

type AuthorizeOutput struct {
    AuthorizationURL string `json:"authorizationUrl"`
}

func (s *OAuthService) Authorize(ctx context.Context, input AuthorizeInput) (*AuthorizeOutput, error) {
    env, err := s.envRepo.GetByID(ctx, input.EnvironmentID)
    if err != nil {
        return nil, fmt.Errorf("environment_not_found")
    }

    clientID, _, err := s.resolveCredentials(ctx, env, input.Provider)
    if err != nil {
        return nil, err
    }

    endpoints, ok := models.OAuthEndpoints[input.Provider]
    if !ok {
        return nil, fmt.Errorf("unsupported_provider")
    }

    // Generate cryptographic state
    stateBytes := make([]byte, 32)
    if _, err := rand.Read(stateBytes); err != nil {
        return nil, fmt.Errorf("state_generation_failed")
    }
    stateValue := base64.URLEncoding.EncodeToString(stateBytes)

    // Save state for CSRF validation
    oauthState := &models.OAuthState{
        ID:            ulid.Make().String(),
        EnvironmentID: input.EnvironmentID,
        Provider:      input.Provider,
        State:         stateValue,
        RedirectURL:   input.RedirectURL,
        ClientOrigin:  input.ClientOrigin,
        ExpiresAt:     time.Now().Add(10 * time.Minute),
    }
    if err := s.oauthRepo.CreateState(ctx, oauthState); err != nil {
        return nil, fmt.Errorf("state_save_failed")
    }

    // Build authorization URL
    scopes := models.DefaultOAuthScopes[input.Provider]
    callbackURL := s.cfg.OAuthCallbackBaseURL + "/oauth/callback"

    params := url.Values{
        "client_id":     {clientID},
        "redirect_uri":  {callbackURL},
        "response_type": {"code"},
        "scope":         {strings.Join(scopes, " ")},
        "state":         {stateValue},
    }

    // Google-specific: request consent and offline access
    if input.Provider == models.ProviderGoogle {
        params.Set("access_type", "offline")
        params.Set("prompt", "consent")
    }

    authURL := endpoints.AuthURL + "?" + params.Encode()

    return &AuthorizeOutput{AuthorizationURL: authURL}, nil
}

type CallbackInput struct {
    Code      string // provider's authorization code
    State     string // CSRF state
    IPAddress string
    UserAgent string
}

type CallbackOutput struct {
    RedirectURL string // full URL to redirect user to, including Permit auth code
}

func (s *OAuthService) HandleCallback(ctx context.Context, input CallbackInput) (*CallbackOutput, error) {
    // 1. Validate state
    oauthState, err := s.oauthRepo.GetAndDeleteState(ctx, input.State)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("invalid_state")
        }
        return nil, err
    }

    env, err := s.envRepo.GetByID(ctx, oauthState.EnvironmentID)
    if err != nil {
        return nil, fmt.Errorf("environment_not_found")
    }

    clientID, clientSecret, err := s.resolveCredentials(ctx, env, oauthState.Provider)
    if err != nil {
        return nil, err
    }

    // 2. Exchange code for access token
    callbackURL := s.cfg.OAuthCallbackBaseURL + "/oauth/callback"
    providerToken, err := s.exchangeCodeForToken(oauthState.Provider, input.Code, clientID, clientSecret, callbackURL)
    if err != nil {
        return nil, fmt.Errorf("token_exchange_failed: %w", err)
    }

    // 3. Fetch user profile
    profile, err := s.fetchUserProfile(oauthState.Provider, providerToken)
    if err != nil {
        return nil, fmt.Errorf("profile_fetch_failed: %w", err)
    }

    // 4. Create or find user
    user, err := s.userRepo.GetByEmail(ctx, profile.Email)
    if err != nil && !errors.Is(err, pgx.ErrNoRows) {
        return nil, err
    }

    var userID string
    if user == nil {
        userID, err = s.userRepo.Create(ctx, &models.User{
            ID:    ulid.Make().String(),
            Email: profile.Email,
        })
        if err != nil {
            return nil, err
        }
    } else {
        userID = user.ID
    }

    // 5. Create/update identity
    existingIdentity, _ := s.identityRepo.GetByUserAndProvider(ctx, userID, oauthState.Provider)
    if existingIdentity == nil {
        if err := s.identityRepo.Create(ctx, &models.Identity{
            ID:             ulid.Make().String(),
            UserID:         userID,
            Provider:       oauthState.Provider,
            ProviderUserID: profile.ProviderUserID,
            Email:          profile.Email,
            Metadata:       profile.RawMetadata,
        }); err != nil {
            log.Warn().Err(err).Str("userId", userID).Str("provider", oauthState.Provider).Msg("failed to create identity")
        }
    }

    // 6. Upsert project_users
    if err := s.projectRepo.UpsertProjectUser(ctx, env.ProjectID, userID, oauthState.Provider); err != nil {
        log.Warn().Err(err).Msg("failed to upsert project user")
    }

    // 7. Log auth event
    s.logAuthEvent(ctx, env.ProjectID, userID, profile.Email, "login", "SUCCESS", input.IPAddress, input.UserAgent)

    // 8. Generate Permit authorization code
    codeBytes := make([]byte, 32)
    if _, err := rand.Read(codeBytes); err != nil {
        return nil, fmt.Errorf("code_generation_failed")
    }
    permitCode := base64.URLEncoding.EncodeToString(codeBytes)

    authCode := &models.OAuthAuthorizationCode{
        ID:            ulid.Make().String(),
        EnvironmentID: oauthState.EnvironmentID,
        UserID:        userID,
        Code:          permitCode,
        Provider:      oauthState.Provider,
        ExpiresAt:     time.Now().Add(60 * time.Second),
    }
    if err := s.oauthRepo.CreateAuthorizationCode(ctx, authCode); err != nil {
        return nil, fmt.Errorf("auth_code_save_failed")
    }

    // 9. Build redirect URL back to client
    redirectURL := oauthState.ClientOrigin + oauthState.RedirectURL + "?code=" + url.QueryEscape(permitCode)

    return &CallbackOutput{RedirectURL: redirectURL}, nil
}

type TokenExchangeInput struct {
    Code          string
    EnvironmentID string
}

func (s *OAuthService) ExchangeToken(ctx context.Context, input TokenExchangeInput) (*VerifyAuthOutput, error) {
    authCode, err := s.oauthRepo.GetAndUseAuthorizationCode(ctx, input.Code)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, fmt.Errorf("invalid_code")
        }
        return nil, err
    }

    if authCode.EnvironmentID != input.EnvironmentID {
        return nil, fmt.Errorf("environment_mismatch")
    }

    env, err := s.envRepo.GetByID(ctx, authCode.EnvironmentID)
    if err != nil {
        return nil, fmt.Errorf("environment_not_found")
    }

    user, err := s.userRepo.GetByID(ctx, authCode.UserID)
    if err != nil {
        return nil, err
    }

    accessToken, err := s.jwtService.SignAccessToken(user.Email, user.ID, env.ProjectID, authCode.Provider)
    if err != nil {
        return nil, fmt.Errorf("token_generation_failed")
    }

    refreshToken, err := s.jwtService.SignRefreshToken(user.ID, env.ProjectID)
    if err != nil {
        return nil, fmt.Errorf("token_generation_failed")
    }

    return &VerifyAuthOutput{
        AccessToken:  accessToken,
        RefreshToken: refreshToken,
        User: &UserInfo{
            ID:    user.ID,
            Email: user.Email,
        },
    }, nil
}

// resolveCredentials returns clientID and clientSecret for the given environment and provider
func (s *OAuthService) resolveCredentials(ctx context.Context, env *models.Environment, provider string) (string, string, error) {
    providerConfig, err := s.oauthRepo.GetProviderConfig(ctx, env.ID, provider)
    if err != nil && !errors.Is(err, pgx.ErrNoRows) {
        return "", "", err
    }

    // Check if provider has custom credentials
    if providerConfig != nil && providerConfig.ClientID != nil && *providerConfig.ClientID != "" {
        if providerConfig.ClientSecretEncrypted == nil || *providerConfig.ClientSecretEncrypted == "" {
            return "", "", fmt.Errorf("provider_secret_missing")
        }
        return *providerConfig.ClientID, *providerConfig.ClientSecretEncrypted, nil
    }

    // Use shared credentials for dev environments
    if env.Type == models.EnvTypeDevelopment {
        switch provider {
        case models.ProviderGoogle:
            if s.cfg.SharedGoogleClientID != "" {
                return s.cfg.SharedGoogleClientID, s.cfg.SharedGoogleClientSecret, nil
            }
        case models.ProviderGitHub:
            if s.cfg.SharedGitHubClientID != "" {
                return s.cfg.SharedGitHubClientID, s.cfg.SharedGitHubClientSecret, nil
            }
        }
    }

    return "", "", fmt.Errorf("provider_not_configured")
}

// Provider profile types
type OAuthUserProfile struct {
    Email          string
    Name           string
    AvatarURL      string
    ProviderUserID string
    RawMetadata    json.RawMessage
}

func (s *OAuthService) exchangeCodeForToken(provider, code, clientID, clientSecret, redirectURI string) (string, error) {
    endpoints := models.OAuthEndpoints[provider]

    data := url.Values{
        "client_id":     {clientID},
        "client_secret": {clientSecret},
        "code":          {code},
        "redirect_uri":  {redirectURI},
    }

    if provider == models.ProviderGoogle {
        data.Set("grant_type", "authorization_code")
    }

    req, err := http.NewRequest("POST", endpoints.TokenURL, strings.NewReader(data.Encode()))
    if err != nil {
        return "", err
    }
    req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
    req.Header.Set("Accept", "application/json")

    resp, err := s.httpClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }

    var tokenResp struct {
        AccessToken string `json:"access_token"`
        Error       string `json:"error"`
    }
    if err := json.Unmarshal(body, &tokenResp); err != nil {
        return "", fmt.Errorf("failed to parse token response")
    }
    if tokenResp.Error != "" {
        return "", fmt.Errorf("provider error: %s", tokenResp.Error)
    }
    if tokenResp.AccessToken == "" {
        return "", fmt.Errorf("no access token in response")
    }

    return tokenResp.AccessToken, nil
}

func (s *OAuthService) fetchUserProfile(provider, accessToken string) (*OAuthUserProfile, error) {
    endpoints := models.OAuthEndpoints[provider]

    req, err := http.NewRequest("GET", endpoints.UserInfoURL, nil)
    if err != nil {
        return nil, err
    }
    req.Header.Set("Authorization", "Bearer "+accessToken)
    req.Header.Set("Accept", "application/json")

    resp, err := s.httpClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    switch provider {
    case models.ProviderGoogle:
        return s.parseGoogleProfile(body)
    case models.ProviderGitHub:
        return s.parseGitHubProfile(body, accessToken)
    default:
        return nil, fmt.Errorf("unsupported provider")
    }
}

func (s *OAuthService) parseGoogleProfile(body []byte) (*OAuthUserProfile, error) {
    var data struct {
        ID      string `json:"id"`
        Email   string `json:"email"`
        Name    string `json:"name"`
        Picture string `json:"picture"`
    }
    if err := json.Unmarshal(body, &data); err != nil {
        return nil, err
    }
    if data.Email == "" {
        return nil, fmt.Errorf("no email in Google profile")
    }
    return &OAuthUserProfile{
        Email:          data.Email,
        Name:           data.Name,
        AvatarURL:      data.Picture,
        ProviderUserID: data.ID,
        RawMetadata:    body,
    }, nil
}

func (s *OAuthService) parseGitHubProfile(body []byte, accessToken string) (*OAuthUserProfile, error) {
    var data struct {
        ID        int    `json:"id"`
        Login     string `json:"login"`
        Email     string `json:"email"`
        Name      string `json:"name"`
        AvatarURL string `json:"avatar_url"`
    }
    if err := json.Unmarshal(body, &data); err != nil {
        return nil, err
    }

    email := data.Email
    // GitHub may not return email in profile; fetch from /user/emails
    if email == "" {
        var err error
        email, err = s.fetchGitHubPrimaryEmail(accessToken)
        if err != nil {
            return nil, fmt.Errorf("no email available from GitHub")
        }
    }

    return &OAuthUserProfile{
        Email:          email,
        Name:           data.Name,
        AvatarURL:      data.AvatarURL,
        ProviderUserID: fmt.Sprintf("%d", data.ID),
        RawMetadata:    body,
    }, nil
}

func (s *OAuthService) fetchGitHubPrimaryEmail(accessToken string) (string, error) {
    req, err := http.NewRequest("GET", models.OAuthEndpoints[models.ProviderGitHub].EmailURL, nil)
    if err != nil {
        return "", err
    }
    req.Header.Set("Authorization", "Bearer "+accessToken)
    req.Header.Set("Accept", "application/json")

    resp, err := s.httpClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return "", err
    }

    var emails []struct {
        Email    string `json:"email"`
        Primary  bool   `json:"primary"`
        Verified bool   `json:"verified"`
    }
    if err := json.Unmarshal(body, &emails); err != nil {
        return "", err
    }

    for _, e := range emails {
        if e.Primary && e.Verified {
            return e.Email, nil
        }
    }
    for _, e := range emails {
        if e.Verified {
            return e.Email, nil
        }
    }

    return "", fmt.Errorf("no verified email found")
}

func (s *OAuthService) logAuthEvent(ctx context.Context, projectID, userID, email, eventType, status, ip, ua string) {
    err := s.projectRepo.InsertAuthLog(ctx, &models.AuthLog{
        ID:        ulid.Make().String(),
        ProjectID: projectID,
        UserID:    userID,
        UserEmail: email,
        EventType: eventType,
        Status:    status,
        IPAddress: ip,
        UserAgent: ua,
        CreatedAt: time.Now(),
    })
    if err != nil {
        log.Warn().Err(err).Msg("failed to log auth event")
    }
}
```

**Step 2: Verify it compiles**

Run: `cd api && go build ./...`

**Step 3: Commit**

```bash
git add api/internal/service/oauth_service.go
git commit -m "feat: add OAuth service with authorize, callback, and token exchange"
```

---

## Phase 4: Backend - OAuth Handler & Routes

### Task 7: Create OAuth handler and register routes

**Files:**
- Create: `api/internal/handler/oauth.go`
- Modify: `api/internal/handler/routes.go` - add OAuth routes
- Modify: `api/cmd/server/main.go` - wire up new repos and services

**Step 1: Create OAuth handler**

Create `api/internal/handler/oauth.go`:

```go
package handler

import (
    "net/http"
    "strings"

    "github.com/marcioecom/permit/internal/service"
    "github.com/rs/zerolog/log"
)

type OAuthHandler struct {
    service *service.OAuthService
}

func NewOAuthHandler(oauthService *service.OAuthService) *OAuthHandler {
    return &OAuthHandler{service: oauthService}
}

type OAuthAuthorizeRequest struct {
    Provider      string `json:"provider" validate:"required,oneof=google github"`
    EnvironmentID string `json:"environmentId" validate:"required"`
    RedirectURL   string `json:"redirectUrl" validate:"required"`
}

func (h *OAuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
    var req OAuthAuthorizeRequest
    if err := decodeAndValidate(r, &req); err != nil {
        writeError(w, http.StatusBadRequest, "validation_error", err.Error())
        return
    }

    // Extract client origin from Origin or Referer header
    clientOrigin := r.Header.Get("Origin")
    if clientOrigin == "" {
        referer := r.Header.Get("Referer")
        if referer != "" {
            // Extract origin from referer
            parts := strings.SplitN(referer, "//", 2)
            if len(parts) == 2 {
                hostEnd := strings.IndexByte(parts[1], '/')
                if hostEnd > 0 {
                    clientOrigin = parts[0] + "//" + parts[1][:hostEnd]
                } else {
                    clientOrigin = referer
                }
            }
        }
    }
    if clientOrigin == "" {
        writeError(w, http.StatusBadRequest, "missing_origin", "Origin header is required")
        return
    }

    output, err := h.service.Authorize(r.Context(), service.AuthorizeInput{
        Provider:      req.Provider,
        EnvironmentID: req.EnvironmentID,
        RedirectURL:   req.RedirectURL,
        ClientOrigin:  clientOrigin,
    })
    if err != nil {
        log.Warn().Err(err).Str("provider", req.Provider).Msg("OAuth authorize failed")
        writeError(w, http.StatusBadRequest, "oauth_authorize_failed", err.Error())
        return
    }

    writeSuccess(w, http.StatusOK, output)
}

func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
    code := r.URL.Query().Get("code")
    state := r.URL.Query().Get("state")

    if code == "" || state == "" {
        writeError(w, http.StatusBadRequest, "missing_params", "code and state are required")
        return
    }

    output, err := h.service.HandleCallback(r.Context(), service.CallbackInput{
        Code:      code,
        State:     state,
        IPAddress: r.RemoteAddr,
        UserAgent: r.UserAgent(),
    })
    if err != nil {
        log.Warn().Err(err).Msg("OAuth callback failed")
        // Redirect to an error page or show error
        http.Error(w, "Authentication failed: "+err.Error(), http.StatusBadRequest)
        return
    }

    http.Redirect(w, r, output.RedirectURL, http.StatusTemporaryRedirect)
}

type OAuthTokenRequest struct {
    Code          string `json:"code" validate:"required"`
    EnvironmentID string `json:"environmentId" validate:"required"`
}

func (h *OAuthHandler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
    var req OAuthTokenRequest
    if err := decodeAndValidate(r, &req); err != nil {
        writeError(w, http.StatusBadRequest, "validation_error", err.Error())
        return
    }

    output, err := h.service.ExchangeToken(r.Context(), service.TokenExchangeInput{
        Code:          req.Code,
        EnvironmentID: req.EnvironmentID,
    })
    if err != nil {
        log.Warn().Err(err).Msg("OAuth token exchange failed")
        writeError(w, http.StatusBadRequest, "token_exchange_failed", err.Error())
        return
    }

    writeSuccess(w, http.StatusOK, output)
}
```

**Step 2: Add OAuth to Handlers struct and routes**

In `api/internal/handler/routes.go`, add `OAuth *OAuthHandler` to the `Handlers` struct and add routes:

```go
// Add to Handlers struct:
OAuth *OAuthHandler

// Add routes in SetupRoutes, inside r.Route("/api/v1", ...) under the /auth route:
r.Route("/auth/oauth", func(r chi.Router) {
    r.Use(corsMiddleware.Handler())
    r.Post("/authorize", h.OAuth.Authorize)
    r.Post("/token", h.OAuth.ExchangeToken)
})

// Add callback route at top level (outside /api/v1, since it's the OAuth redirect_uri):
r.Get("/oauth/callback", h.OAuth.Callback)
```

**Step 3: Wire up in main.go**

In `api/cmd/server/main.go`, add:

```go
// New repos
envRepo := repository.NewPostgresEnvironmentRepo(db.Pool)
oauthRepo := repository.NewPostgresOAuthRepo(db.Pool)

// New service
oauthService := service.NewOAuthService(cfg, jwtService, oauthRepo, envRepo, userRepo, identityRepo, projectRepo)

// Add to handlers
handlers.OAuth = handler.NewOAuthHandler(oauthService)
```

**Step 4: Verify it compiles**

Run: `cd api && go build ./...`

**Step 5: Commit**

```bash
git add api/internal/handler/oauth.go api/internal/handler/routes.go api/cmd/server/main.go
git commit -m "feat: add OAuth handler with authorize, callback, and token exchange endpoints"
```

---

## Phase 5: Backend - Environment Dashboard Endpoints

### Task 8: Add environment CRUD endpoints to dashboard handler

**Files:**
- Modify: `api/internal/handler/dashboard.go` - add environment handlers
- Modify: `api/internal/handler/routes.go` - add environment routes
- Create: `api/internal/service/environment_service.go`

**Step 1: Create environment service**

Create `api/internal/service/environment_service.go`:

```go
package service

import (
    "context"
    "fmt"

    "github.com/marcioecom/permit/internal/models"
    "github.com/marcioecom/permit/internal/repository"
    "github.com/oklog/ulid/v2"
)

type EnvironmentService struct {
    envRepo     repository.EnvironmentRepository
    projectRepo repository.ProjectRepository
}

func NewEnvironmentService(
    envRepo repository.EnvironmentRepository,
    projectRepo repository.ProjectRepository,
) *EnvironmentService {
    return &EnvironmentService{
        envRepo:     envRepo,
        projectRepo: projectRepo,
    }
}

type CreateEnvironmentInput struct {
    ProjectID string
    Name      string
    Type      string
    OwnerID   string // for authorization
}

func (s *EnvironmentService) Create(ctx context.Context, input CreateEnvironmentInput) (*models.Environment, error) {
    project, err := s.projectRepo.GetByID(ctx, input.ProjectID)
    if err != nil || project == nil {
        return nil, fmt.Errorf("project_not_found")
    }
    if project.OwnerID != input.OwnerID {
        return nil, fmt.Errorf("not_authorized")
    }

    // Validate type
    switch input.Type {
    case models.EnvTypeDevelopment, models.EnvTypeStaging, models.EnvTypeProduction:
    default:
        return nil, fmt.Errorf("invalid_environment_type")
    }

    env := &models.Environment{
        ID:        ulid.Make().String(),
        ProjectID: input.ProjectID,
        Name:      input.Name,
        Type:      input.Type,
    }

    if err := s.envRepo.Create(ctx, env); err != nil {
        return nil, err
    }

    return s.envRepo.GetByID(ctx, env.ID)
}

func (s *EnvironmentService) ListByProject(ctx context.Context, projectID, ownerID string) ([]*models.Environment, error) {
    project, err := s.projectRepo.GetByID(ctx, projectID)
    if err != nil || project == nil {
        return nil, fmt.Errorf("project_not_found")
    }
    if project.OwnerID != ownerID {
        return nil, fmt.Errorf("not_authorized")
    }
    return s.envRepo.GetByProjectID(ctx, projectID)
}

func (s *EnvironmentService) GetByID(ctx context.Context, id, ownerID string) (*models.Environment, error) {
    env, err := s.envRepo.GetByID(ctx, id)
    if err != nil {
        return nil, err
    }
    project, err := s.projectRepo.GetByID(ctx, env.ProjectID)
    if err != nil || project == nil || project.OwnerID != ownerID {
        return nil, fmt.Errorf("not_authorized")
    }
    return env, nil
}
```

**Step 2: Add environment endpoints to dashboard handler**

Add to `api/internal/handler/dashboard.go`:

```go
// Add EnvironmentService and OAuthRepository to DashboardHandler struct
// Add handler methods: ListEnvironments, CreateEnvironment, GetEnvironment
// Add handler methods: ListOAuthProviders, UpsertOAuthProvider, DeleteOAuthProvider
```

The handler methods follow the same pattern as existing dashboard methods (decode request, call service, write response).

**Step 3: Add routes**

In `api/internal/handler/routes.go`, inside the `/dashboard` route group:

```go
r.Route("/projects/{id}/environments", func(r chi.Router) {
    r.Get("/", h.Dashboard.ListEnvironments)
    r.Post("/", h.Dashboard.CreateEnvironment)
    r.Get("/{envId}", h.Dashboard.GetEnvironment)
    r.Patch("/{envId}", h.Dashboard.UpdateEnvironment)

    r.Route("/{envId}/oauth-providers", func(r chi.Router) {
        r.Get("/", h.Dashboard.ListOAuthProviders)
        r.Post("/", h.Dashboard.UpsertOAuthProvider)
        r.Delete("/{provider}", h.Dashboard.DeleteOAuthProvider)
    })
})
```

**Step 4: Wire up in main.go**

```go
envService := service.NewEnvironmentService(envRepo, projectRepo)
// Pass envService and oauthRepo to DashboardHandler
```

**Step 5: Verify it compiles**

Run: `cd api && go build ./...`

**Step 6: Commit**

```bash
git add api/internal/service/environment_service.go api/internal/handler/dashboard.go api/internal/handler/routes.go api/cmd/server/main.go
git commit -m "feat: add environment CRUD and OAuth provider config dashboard endpoints"
```

---

## Phase 6: React SDK - OAuth Support

### Task 9: Add OAuth API functions to React SDK

**Files:**
- Modify: `packages/react/src/lib/api.ts` - add OAuth endpoints
- Modify: `packages/react/src/types/api.ts` - add OAuth types if needed

**Step 1: Add OAuth API functions**

Add to `packages/react/src/lib/api.ts`:

```typescript
// ============================================
// OAuth Authentication
// ============================================

export const oauthAuthorize = (
  apiUrl: string,
  data: { provider: string; environmentId: string; redirectUrl: string }
): Promise<{ authorizationUrl: string }> => {
  const api = createApiClient(apiUrl);
  return api.post("/auth/oauth/authorize", data);
};

export const oauthExchangeToken = (
  apiUrl: string,
  data: { code: string; environmentId: string }
): Promise<AuthResponse> => {
  const api = createApiClient(apiUrl);
  return api.post("/auth/oauth/token", data);
};
```

**Step 2: Commit**

```bash
git add packages/react/src/lib/api.ts
git commit -m "feat: add OAuth authorize and token exchange API functions to React SDK"
```

---

### Task 10: Enable OAuth buttons in PermitModal

**Files:**
- Modify: `packages/react/src/components/PermitModal.tsx` - make OAuth buttons functional
- Modify: `packages/react/src/PermitProvider.tsx` - add ssoCallbackUrl prop

**Step 1: Update PermitProvider to accept ssoCallbackUrl**

In `packages/react/src/PermitProvider.tsx`, add `ssoCallbackUrl` to props:

```typescript
interface PermitProviderProps {
  projectId: string;
  ssoCallbackUrl?: string; // e.g. "/sso-callback"
  config?: PermitConfig;
  children: ReactNode;
}
```

Pass it through context so PermitModal can access it.

Add `ssoCallbackUrl` to `PermitContext` interface in `packages/react/src/context/PermitContext.tsx`.

**Step 2: Make OAuth buttons functional in PermitModal**

In `packages/react/src/components/PermitModal.tsx`, replace the disabled social buttons:

```typescript
// Replace the disabled buttons with functional ones:
{hasGoogle && (
  <Button
    variant="outline"
    onClick={() => handleOAuthSignIn("google")}
    disabled={loading}
  >
    <Google /> Google
  </Button>
)}
{hasGithub && (
  <Button
    variant="outline"
    onClick={() => handleOAuthSignIn("github")}
    disabled={loading}
  >
    {theme === "dark" ? <GithubDark /> : <GithubLight />}
    GitHub
  </Button>
)}
```

Add the handler function inside PermitModal:

```typescript
const { ssoCallbackUrl } = usePermit();

const handleOAuthSignIn = async (provider: string) => {
  setLoading(true);
  setError(null);
  try {
    const callbackUrl = ssoCallbackUrl || "/sso-callback";
    const response = await oauthAuthorize(apiUrl, {
      provider,
      environmentId: projectId, // backwards compat: projectId acts as environmentId
      redirectUrl: callbackUrl,
    });
    window.location.href = response.authorizationUrl;
  } catch (err) {
    const apiError = err as ApiError;
    setError(apiError.message || "Failed to start OAuth flow");
    setLoading(false);
  }
};
```

**Step 3: Verify it builds**

Run: `cd packages/react && pnpm build`

**Step 4: Commit**

```bash
git add packages/react/src/components/PermitModal.tsx packages/react/src/PermitProvider.tsx packages/react/src/context/PermitContext.tsx
git commit -m "feat: enable functional OAuth buttons in PermitModal"
```

---

### Task 11: Create PermitSSOCallback component

**Files:**
- Create: `packages/react/src/components/PermitSSOCallback.tsx`
- Modify: `packages/react/src/index.ts` - export new component

**Step 1: Create the SSO callback component**

Create `packages/react/src/components/PermitSSOCallback.tsx`:

```tsx
import { usePermit } from "@/hooks/usePermit";
import { oauthExchangeToken } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

interface PermitSSOCallbackProps {
  afterSignInUrl?: string;
  onSuccess?: (accessToken: string, refreshToken: string, user: { id: string; email: string }) => void;
  onError?: (error: string) => void;
}

export const PermitSSOCallback = ({
  afterSignInUrl = "/",
  onSuccess,
  onError,
}: PermitSSOCallbackProps) => {
  const { apiUrl, projectId } = usePermit();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) {
      const errorMsg = "No authorization code found in URL";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    const exchangeCode = async () => {
      try {
        const response = await oauthExchangeToken(apiUrl, {
          code,
          environmentId: projectId,
        });

        // Store credentials using same pattern as OTP flow
        localStorage.setItem(`permit_token_${projectId}`, response.accessToken);
        localStorage.setItem(`permit_refresh_token_${projectId}`, response.refreshToken);
        localStorage.setItem(`permit_user_${projectId}`, JSON.stringify(response.user));

        onSuccess?.(response.accessToken, response.refreshToken, response.user);

        // Redirect to final destination
        window.location.href = afterSignInUrl;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Authentication failed";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    exchangeCode();
  }, [apiUrl, projectId, afterSignInUrl, onSuccess, onError]);

  if (error) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#ef4444", marginBottom: "8px" }}>Authentication failed</p>
          <p style={{ color: "#6b7280", fontSize: "14px" }}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "200px" }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Completing sign in...</p>
      </div>
    </div>
  );
};
```

**Step 2: Export from index.ts**

Add to `packages/react/src/index.ts`:

```typescript
export { PermitSSOCallback } from "./components/PermitSSOCallback";
```

**Step 3: Verify it builds**

Run: `cd packages/react && pnpm build`

**Step 4: Commit**

```bash
git add packages/react/src/components/PermitSSOCallback.tsx packages/react/src/index.ts
git commit -m "feat: add PermitSSOCallback component for OAuth redirect handling"
```

---

## Phase 7: Dashboard - Environment Management UI

### Task 12: Add environment management to dashboard

**Files:**
- Create: `apps/dashboard/src/hooks/useEnvironments.ts`
- Create: `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/page.tsx`
- Modify: `apps/dashboard/src/components/layout/ProjectTabs.tsx` - add Environments tab
- Modify: `apps/dashboard/src/lib/api.ts` - add environment API methods

**Step 1: Add environment API methods**

In `apps/dashboard/src/lib/api.ts`, add environment-related interfaces and methods:

```typescript
export interface Environment {
  id: string;
  projectId: string;
  name: string;
  type: "development" | "staging" | "production";
  allowedOrigins: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OAuthProviderConfig {
  id: string;
  environmentId: string;
  provider: string;
  enabled: boolean;
  clientId?: string;
  scopes: string[];
  createdAt: string;
  updatedAt: string;
}

// Add methods to dashboardApi:
async listEnvironments(token: string, projectId: string): Promise<Environment[]>
async createEnvironment(token: string, projectId: string, data: { name: string; type: string }): Promise<Environment>
async listOAuthProviders(token: string, projectId: string, envId: string): Promise<OAuthProviderConfig[]>
async upsertOAuthProvider(token: string, projectId: string, envId: string, data: { provider: string; enabled: boolean; clientId?: string; clientSecret?: string }): Promise<OAuthProviderConfig>
async deleteOAuthProvider(token: string, projectId: string, envId: string, provider: string): Promise<void>
```

**Step 2: Create useEnvironments hook**

Create `apps/dashboard/src/hooks/useEnvironments.ts` following the pattern from `useProjects.ts`:

```typescript
"use client";
import { usePermit } from "@permitdev/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";

export function useEnvironments(projectId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const { data: environments = [], isLoading } = useQuery({
    queryKey: ["environments", projectId],
    queryFn: async () => {
      if (!token) return [];
      return dashboardApi.listEnvironments(token, projectId);
    },
    enabled: !!token && !!projectId,
  });

  const createEnvironment = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.createEnvironment(token, projectId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["environments", projectId] });
    },
  });

  return { environments, isLoading, createEnvironment };
}
```

**Step 3: Create environments page**

Create `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/page.tsx` following existing page patterns (GlassCard, Button, StatCard components). The page should:

- List all environments for the project
- Show create environment form
- For each environment, show type badge and creation date
- Link to environment detail (OAuth config)

**Step 4: Add Environments tab to ProjectTabs**

In `apps/dashboard/src/components/layout/ProjectTabs.tsx`, add:

```typescript
{ href: `/projects/${projectId}/environments`, label: "Environments" },
```

**Step 5: Verify it builds**

Run: `cd apps/dashboard && pnpm build`

**Step 6: Commit**

```bash
git add apps/dashboard/src/hooks/useEnvironments.ts apps/dashboard/src/app/\(dashboard\)/projects/\[id\]/environments/ apps/dashboard/src/components/layout/ProjectTabs.tsx apps/dashboard/src/lib/api.ts
git commit -m "feat: add environment management UI to dashboard"
```

---

### Task 13: Add OAuth provider configuration page per environment

**Files:**
- Create: `apps/dashboard/src/hooks/useOAuthProviders.ts`
- Create: `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/[envId]/page.tsx`

**Step 1: Create useOAuthProviders hook**

Create `apps/dashboard/src/hooks/useOAuthProviders.ts`:

```typescript
"use client";
import { usePermit } from "@permitdev/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";

export function useOAuthProviders(projectId: string, envId: string) {
  const { token } = usePermit();
  const queryClient = useQueryClient();

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ["oauth-providers", projectId, envId],
    queryFn: async () => {
      if (!token) return [];
      return dashboardApi.listOAuthProviders(token, projectId, envId);
    },
    enabled: !!token && !!projectId && !!envId,
  });

  const upsertProvider = useMutation({
    mutationFn: async (data: { provider: string; enabled: boolean; clientId?: string; clientSecret?: string }) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.upsertOAuthProvider(token, projectId, envId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oauth-providers", projectId, envId] });
    },
  });

  const deleteProvider = useMutation({
    mutationFn: async (provider: string) => {
      if (!token) throw new Error("Not authenticated");
      return dashboardApi.deleteOAuthProvider(token, projectId, envId, provider);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["oauth-providers", projectId, envId] });
    },
  });

  return { providers, isLoading, upsertProvider, deleteProvider };
}
```

**Step 2: Create environment detail/OAuth config page**

Create `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/[envId]/page.tsx`:

The page should show:
- Environment details (name, type, allowed origins)
- OAuth providers section with toggles for Google and GitHub
- For dev environments: "Using Permit test credentials" badge when no custom creds
- For prod environments: client_id + client_secret form fields
- Save button per provider
- Setup instructions link for each provider

Use the project's existing design patterns: GlassCard, Button, Input, Toggle, Badge components. Use `@tabler/icons-react` for icons (IconBrandGoogle, IconBrandGithub).

**Step 3: Verify it builds**

Run: `cd apps/dashboard && pnpm build`

**Step 4: Commit**

```bash
git add apps/dashboard/src/hooks/useOAuthProviders.ts apps/dashboard/src/app/\(dashboard\)/projects/\[id\]/environments/\[envId\]/
git commit -m "feat: add OAuth provider configuration page per environment"
```

---

## Phase 8: Server SDK Updates

### Task 14: Add environmentId support to Server SDK

**Files:**
- Modify: `packages/server/src/types.ts` - add environmentId to config
- Modify: `packages/server/src/verify.ts` - validate eid claim
- Modify: `packages/server/src/index.ts` - accept environmentId

**Step 1: Update types**

In `packages/server/src/types.ts`, add `environmentId` as an optional field to `PermitConfig`:

```typescript
interface PermitConfig {
  clientId: string;
  clientSecret: string;
  environmentId?: string; // optional, for environment-scoped verification
  baseUrl?: string;
  cacheTtl?: number;
}
```

Add `environmentId` to `PermitUser`:

```typescript
interface PermitUser {
  userId: string;
  email: string;
  appId: string;
  environmentId?: string;
  provider: string;
  issuedAt: Date;
  expiresAt: Date;
}
```

**Step 2: Update verify.ts to extract eid claim**

In `packages/server/src/verify.ts`, extract the `eid` claim from JWT payload and include it in the returned user object.

**Step 3: Verify it builds**

Run: `cd packages/server && pnpm build`

**Step 4: Commit**

```bash
git add packages/server/src/types.ts packages/server/src/verify.ts packages/server/src/index.ts
git commit -m "feat: add environmentId support to server SDK"
```

---

## Phase 9: Example App Update

### Task 15: Update example Next.js app with SSO callback route

**Files:**
- Create: `examples/nextjs/app/sso-callback/page.tsx`
- Modify: `examples/nextjs/` - update PermitProvider with ssoCallbackUrl

**Step 1: Create SSO callback page**

Create `examples/nextjs/app/sso-callback/page.tsx`:

```tsx
"use client";
import { PermitSSOCallback } from "@permitdev/react";

export default function SSOCallbackPage() {
  return <PermitSSOCallback afterSignInUrl="/" />;
}
```

**Step 2: Update PermitProvider usage**

In the example app's provider setup, add `ssoCallbackUrl="/sso-callback"`.

**Step 3: Commit**

```bash
git add examples/nextjs/app/sso-callback/page.tsx
git commit -m "feat: add SSO callback route to example Next.js app"
```

---

## Phase 10: Integration Testing

### Task 16: Manual end-to-end test

**Step 1: Start the backend**

Run: `cd api && go run cmd/server/main.go`

Verify:
- Migration 005 and 006 apply successfully
- Server starts without errors

**Step 2: Test environment creation via API**

```bash
# Create a project first (if needed), then create environments
curl -X POST http://localhost:8080/api/v1/dashboard/projects/{projectId}/environments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production", "type": "production"}'
```

**Step 3: Test OAuth flow**

1. Configure shared OAuth credentials in `.env`
2. Enable Google/GitHub provider for the development environment
3. Call POST /api/v1/auth/oauth/authorize
4. Verify it returns a valid authorization URL
5. Follow the URL and complete the OAuth flow
6. Verify the callback redirects to the client with a code
7. Exchange the code for tokens via POST /api/v1/auth/oauth/token

**Step 4: Test SDK**

1. Run example Next.js app
2. Click "Sign in with Google" in the PermitModal
3. Complete OAuth flow
4. Verify redirect to /sso-callback
5. Verify PermitSSOCallback exchanges code and stores tokens
6. Verify user is authenticated

**Step 5: Test dashboard**

1. Navigate to a project's Environments tab
2. Verify default development environment exists
3. Create a production environment
4. Configure OAuth provider for production (add credentials)
5. Verify provider toggle works

---

## Summary of all files to create/modify

### New files:
- `api/internal/database/migrations/005_add_environments.sql`
- `api/internal/database/migrations/006_add_oauth_tables.sql`
- `api/internal/models/environment.go`
- `api/internal/models/oauth.go`
- `api/internal/repository/environment_repo.go`
- `api/internal/repository/oauth_repo.go`
- `api/internal/service/oauth_service.go`
- `api/internal/service/environment_service.go`
- `api/internal/handler/oauth.go`
- `apps/dashboard/src/hooks/useEnvironments.ts`
- `apps/dashboard/src/hooks/useOAuthProviders.ts`
- `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/page.tsx`
- `apps/dashboard/src/app/(dashboard)/projects/[id]/environments/[envId]/page.tsx`
- `packages/react/src/components/PermitSSOCallback.tsx`
- `examples/nextjs/app/sso-callback/page.tsx`

### Modified files:
- `api/internal/config/config.go`
- `api/internal/handler/routes.go`
- `api/internal/handler/dashboard.go`
- `api/cmd/server/main.go`
- `packages/react/src/lib/api.ts`
- `packages/react/src/PermitProvider.tsx`
- `packages/react/src/context/PermitContext.tsx`
- `packages/react/src/components/PermitModal.tsx`
- `packages/react/src/index.ts`
- `packages/server/src/types.ts`
- `packages/server/src/verify.ts`
- `packages/server/src/index.ts`
- `apps/dashboard/src/lib/api.ts`
- `apps/dashboard/src/components/layout/ProjectTabs.tsx`
