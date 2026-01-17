package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models"
)

type UserRepository interface {
	Create(ctx context.Context, p *models.User) (string, error)
	GetByID(ctx context.Context, id string) (*models.User, error)
}

type postgresUserRepo struct {
	db *pgxpool.Pool
}

func NewPostgresUserRepo(db *pgxpool.Pool) UserRepository {
	return &postgresUserRepo{db: db}
}

func (r *postgresUserRepo) Create(ctx context.Context, u *models.User) (string, error) {
	var insertedUserID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (id, email)
		VALUES ($1, $2)
		ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
		RETURNING id;
		`,
		u.ID, u.Email).Scan(&insertedUserID)
	if err != nil {
		return "", err
	}

	return insertedUserID, nil
}

func (r *postgresUserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User

	err := r.db.QueryRow(ctx, `
		SELECT id, email, created_at
		FROM users WHERE id = $1;
	`, id).Scan(&user.ID, &user.Email, &user.CreatedAt)
	if err != nil {
		return nil, err
	}

	return &user, nil
}
