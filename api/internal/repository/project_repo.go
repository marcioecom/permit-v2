package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models"
	"golang.org/x/crypto/bcrypt"
)

type ProjectRepository interface {
	Create(ctx context.Context, p *models.Project) error
	GetByID(ctx context.Context, id string) (*models.Project, error)
	Update(ctx context.Context, p *models.Project) error
	GetWidget(ctx context.Context, projectID string) (*models.Widget, error)
	UpdateWidget(ctx context.Context, w *models.Widget) error
	CreateAPIKey(ctx context.Context, key *models.APIKey) error
	GetAPIKeys(ctx context.Context, projectID string) ([]*models.APIKey, error)
	GetAPIKeyByClientID(ctx context.Context, clientID string) (*models.APIKey, error)
}

type postgresProjectRepo struct {
	db *pgxpool.Pool
}

func NewPostgresProjectRepo(db *pgxpool.Pool) ProjectRepository {
	return &postgresProjectRepo{db: db}
}

func (r *postgresProjectRepo) Create(ctx context.Context, p *models.Project) error {
	query := `
		INSERT INTO projects (id, owner_id, name, description, allowed_origins, allowed_providers, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
	`
	_, err := r.db.Exec(ctx, query, p.ID, p.OwnerID, p.Name, p.Description, p.AllowedOrigins, p.AllowedProviders)
	return err
}

func (r *postgresProjectRepo) GetByID(ctx context.Context, id string) (*models.Project, error) {
	query := `
		SELECT id, owner_id, name, description, allowed_origins, allowed_providers, created_at, updated_at
		FROM projects WHERE id = $1
	`
	p := &models.Project{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.OwnerID, &p.Name, &p.Description, &p.AllowedOrigins, &p.AllowedProviders, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return p, nil
}

func (r *postgresProjectRepo) Update(ctx context.Context, p *models.Project) error {
	query := `
		UPDATE projects SET name = $2, description = $3, allowed_origins = $4, allowed_providers = $5, updated_at = NOW()
		WHERE id = $1
	`
	_, err := r.db.Exec(ctx, query, p.ID, p.Name, p.Description, p.AllowedOrigins, p.AllowedProviders)
	return err
}

func (r *postgresProjectRepo) GetWidget(ctx context.Context, projectID string) (*models.Widget, error) {
	query := `
		SELECT project_id, title, subtitle, theme_config, enabled_providers, updated_at
		FROM widgets WHERE project_id = $1
	`
	w := &models.Widget{}
	var themeJSON []byte
	err := r.db.QueryRow(ctx, query, projectID).Scan(
		&w.ProjectID, &w.Title, &w.Subtitle, &themeJSON, &w.EnabledProviders, &w.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return w, nil
}

func (r *postgresProjectRepo) UpdateWidget(ctx context.Context, w *models.Widget) error {
	query := `
		INSERT INTO widgets (project_id, title, subtitle, theme_config, enabled_providers, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (project_id) DO UPDATE SET
			title = EXCLUDED.title,
			subtitle = EXCLUDED.subtitle,
			theme_config = EXCLUDED.theme_config,
			enabled_providers = EXCLUDED.enabled_providers,
			updated_at = NOW()
	`
	_, err := r.db.Exec(ctx, query, w.ProjectID, w.Title, w.Subtitle, w.ThemeConfig, w.EnabledProviders)
	return err
}

func (r *postgresProjectRepo) CreateAPIKey(ctx context.Context, key *models.APIKey) error {
	query := `
		INSERT INTO project_api_keys (id, project_id, name, client_id, client_secret_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`
	_, err := r.db.Exec(ctx, query, key.ID, key.ProjectID, key.Name, key.ClientID, key.ClientSecretHash)
	return err
}

func (r *postgresProjectRepo) GetAPIKeys(ctx context.Context, projectID string) ([]*models.APIKey, error) {
	query := `
		SELECT id, project_id, name, client_id, last_used_at, created_at
		FROM project_api_keys WHERE project_id = $1
	`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []*models.APIKey
	for rows.Next() {
		k := &models.APIKey{}
		if err := rows.Scan(&k.ID, &k.ProjectID, &k.Name, &k.ClientID, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

func (r *postgresProjectRepo) GetAPIKeyByClientID(ctx context.Context, clientID string) (*models.APIKey, error) {
	query := `
		SELECT id, project_id, name, client_id, client_secret_hash, last_used_at, created_at
		FROM project_api_keys WHERE client_id = $1
	`
	k := &models.APIKey{}
	err := r.db.QueryRow(ctx, query, clientID).Scan(
		&k.ID, &k.ProjectID, &k.Name, &k.ClientID, &k.ClientSecretHash, &k.LastUsedAt, &k.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return k, nil
}

func GenerateClientID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return "pk_" + hex.EncodeToString(b)
}

func GenerateClientSecret() (plain, hash string, err error) {
	b := make([]byte, 32)
	if _, err = rand.Read(b); err != nil {
		return
	}
	plain = "sk_" + hex.EncodeToString(b)
	hashed, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", "", err
	}
	hash = string(hashed)
	return
}
