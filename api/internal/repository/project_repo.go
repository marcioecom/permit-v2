package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models" // Suas structs
)

type ProjectRepository interface {
	Create(ctx context.Context, p *models.Project) error
	GetByID(ctx context.Context, id string) (*models.Project, error)
}

type postgresProjectRepo struct {
	db *pgxpool.Pool
}

func NewPostgresProjectRepo(db *pgxpool.Pool) ProjectRepository {
	return &postgresProjectRepo{db: db}
}

func (r *postgresProjectRepo) Create(ctx context.Context, p *models.Project) error {
	return nil
}

func (r *postgresProjectRepo) GetByID(ctx context.Context, id string) (*models.Project, error) {
	return nil, nil
}
