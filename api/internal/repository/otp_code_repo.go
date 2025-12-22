package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models"
)

type OTPCodeRepository interface {
	Create(ctx context.Context, p *models.OTPCode) error
	GetByID(ctx context.Context, id string) (*models.OTPCode, error)
}

type postgresOTPCodeRepo struct {
	db *pgxpool.Pool
}

func NewPostgresOTPCodeRepo(db *pgxpool.Pool) OTPCodeRepository {
	return &postgresOTPCodeRepo{db: db}
}

func (r *postgresOTPCodeRepo) Create(ctx context.Context, p *models.OTPCode) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO otp_codes (id, user_id, project_id, code, expires_at)
		VALUES ($1, $2, $3, $4, $5);
		`,
		p.ID, p.UserID, p.ProjectID, p.Code, p.ExpiresAt)
	if err != nil {
		return err
	}

	return nil
}

func (r *postgresOTPCodeRepo) GetByID(ctx context.Context, id string) (*models.OTPCode, error) {
	return nil, nil
}
