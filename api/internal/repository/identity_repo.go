package repository

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/marcioecom/permit/internal/models"
)

type IdentityRepository interface {
	Create(ctx context.Context, identity *models.Identity) error
	GetByUserID(ctx context.Context, userID string) ([]*models.Identity, error)
	GetByProviderAndEmail(ctx context.Context, provider, email string) (*models.Identity, error)
	GetByUserAndProvider(ctx context.Context, userID, provider string) (*models.Identity, error)
	Delete(ctx context.Context, id string) error
}

type identityRepository struct {
	db *pgxpool.Pool
}

func NewIdentityRepository(db *pgxpool.Pool) IdentityRepository {
	return &identityRepository{db: db}
}

func (r *identityRepository) Create(ctx context.Context, identity *models.Identity) error {
	query := `
		INSERT INTO identities (id, user_id, provider, provider_user_id, email, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err := r.db.Exec(ctx, query,
		identity.ID,
		identity.UserID,
		identity.Provider,
		identity.ProviderUserID,
		identity.Email,
		identity.Metadata,
	)
	return err
}

func (r *identityRepository) GetByUserID(ctx context.Context, userID string) ([]*models.Identity, error) {
	query := `
		SELECT id, user_id, provider, provider_user_id, email, metadata, created_at
		FROM identities
		WHERE user_id = $1
		ORDER BY created_at ASC
	`
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var identities []*models.Identity
	for rows.Next() {
		i := &models.Identity{}
		err := rows.Scan(&i.ID, &i.UserID, &i.Provider, &i.ProviderUserID, &i.Email, &i.Metadata, &i.CreatedAt)
		if err != nil {
			return nil, err
		}
		identities = append(identities, i)
	}
	return identities, rows.Err()
}

func (r *identityRepository) GetByProviderAndEmail(ctx context.Context, provider, email string) (*models.Identity, error) {
	query := `
		SELECT id, user_id, provider, provider_user_id, email, metadata, created_at
		FROM identities
		WHERE provider = $1 AND email = $2
	`
	row := r.db.QueryRow(ctx, query, provider, email)

	i := &models.Identity{}
	err := row.Scan(&i.ID, &i.UserID, &i.Provider, &i.ProviderUserID, &i.Email, &i.Metadata, &i.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return i, nil
}

func (r *identityRepository) GetByUserAndProvider(ctx context.Context, userID, provider string) (*models.Identity, error) {
	query := `
		SELECT id, user_id, provider, provider_user_id, email, metadata, created_at
		FROM identities
		WHERE user_id = $1 AND provider = $2
	`
	row := r.db.QueryRow(ctx, query, userID, provider)

	i := &models.Identity{}
	err := row.Scan(&i.ID, &i.UserID, &i.Provider, &i.ProviderUserID, &i.Email, &i.Metadata, &i.CreatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	return i, nil
}

func (r *identityRepository) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM identities WHERE id = $1", id)
	return err
}
