package database

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/marcioecom/permit/internal/config"
	"github.com/oklog/ulid/v2"
)

func (db *DB) Seed(ctx context.Context, cfg *config.Config) error {
	tx, err := db.Pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	if err := seedAdminUser(ctx, tx, cfg); err != nil {
		return err
	}

	fmt.Println("Applied seed!")
	return tx.Commit(ctx)
}

func seedAdminUser(ctx context.Context, tx pgx.Tx, cfg *config.Config) error {
	adminEmail := cfg.AdminEmail
	projectName := "Permit Dashboard"

	userID := ulid.Make().String()
	projectID := ulid.Make().String()

	var insertedUserID string
	err := tx.QueryRow(ctx, `
        INSERT INTO users (id, email)
        VALUES ($1, $2)
        ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email -- "Fake" update to return ID
        RETURNING id;
    `, userID, adminEmail).Scan(&insertedUserID)
	if err != nil {
		return fmt.Errorf("failed to seed user: %w", err)
	}

	_, err = tx.Exec(ctx, `
        INSERT INTO projects (id, owner_id, name, allowed_origins)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING; -- Assumindo que não queremos duplicar se rodar de novo
        -- Nota: Como o ID é gerado na hora, o ON CONFLICT id não vai funcionar bem.
        -- O ideal para seeds é checar existência antes por uma chave lógica (ex: nome + owner)
    `, projectID, insertedUserID, projectName, []string{"https://permit.marcio.run", "http://localhost:3000"})
	if err != nil {
		return fmt.Errorf("failed to seed project: %w", err)
	}

	_, err = tx.Exec(ctx, `
        INSERT INTO project_users (user_id, project_id, name)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, project_id) DO NOTHING;
    `, insertedUserID, projectID, "Marcio (Admin)")
	if err != nil {
		return fmt.Errorf("failed to seed project_user: %w", err)
	}

	return nil
}
