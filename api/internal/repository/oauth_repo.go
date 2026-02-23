package repository

import (
	"context"

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
	return configs, rows.Err()
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
