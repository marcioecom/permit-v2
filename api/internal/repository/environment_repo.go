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
	return envs, rows.Err()
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
