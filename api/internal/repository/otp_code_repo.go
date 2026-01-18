package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models"
)

type OTPCodeRepository interface {
	Create(ctx context.Context, p *models.OTPCode) error
	GetByProjectAndCode(ctx context.Context, projectID string, code string) (*models.OTPCode, error)
	MarkCodeAsUsed(ctx context.Context, codeID string) error
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

func (r *postgresOTPCodeRepo) GetByProjectAndCode(ctx context.Context, projectID string, code string) (*models.OTPCode, error) {
	var otpCode models.OTPCode

	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, code, used_at, expires_at FROM otp_codes WHERE project_id = $1 AND code = $2;
		`, projectID, code).
		Scan(&otpCode.ID, &otpCode.UserID, &otpCode.Code, &otpCode.UsedAt, &otpCode.ExpiresAt)
	if err != nil {
		return nil, err
	}

	return &otpCode, nil
}

func (r *postgresOTPCodeRepo) MarkCodeAsUsed(ctx context.Context, codeID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE otp_codes SET used_at = $1 WHERE id = $2
		`, time.Now(), codeID)
	if err != nil {
		return err
	}

	return nil
}
