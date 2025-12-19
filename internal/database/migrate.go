package database

import (
	"context"
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func (db *DB) MigrateUp(ctx context.Context) error {
	// Create migrations tracking table
	_, err := db.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %w", err)
	}

	// Get applied migrations
	rows, err := db.Pool.Query(ctx, "SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		return fmt.Errorf("failed to query migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return fmt.Errorf("failed to scan migration version: %w", err)
		}
		applied[version] = true
	}

	// Get migration files
	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)

	// Apply pending migrations
	for _, file := range files {
		version := strings.TrimSuffix(file, ".sql")
		if applied[version] {
			continue
		}

		content, err := fs.ReadFile(migrationsFS, filepath.Join("migrations", file))
		if err != nil {
			return fmt.Errorf("failed to read migration %s: %w", file, err)
		}

		sql := extractUpMigration(string(content))

		tx, err := db.Pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("failed to begin transaction for %s: %w", file, err)
		}

		if _, err := tx.Exec(ctx, sql); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}

		if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", version); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}

		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", file, err)
		}

		fmt.Printf("Applied migration: %s\n", file)
	}

	return nil
}

func (db *DB) MigrateDown(ctx context.Context) error { return nil }

func (db *DB) MigrateShow(ctx context.Context) error {
	rows, err := db.Pool.Query(ctx, "SELECT version FROM schema_migrations ORDER BY version")
	if err != nil {
		return fmt.Errorf("failed to query migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)

	for rows.Next() {
		var version string
		if err = rows.Scan(&version); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}
		applied[version] = true
	}

	entries, err := fs.ReadDir(migrationsFS, "migrations")
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}

	var files []string
	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".sql") {
			files = append(files, entry.Name())
		}
	}
	sort.Strings(files)

	for _, file := range files {
		version := strings.TrimSuffix(file, ".sql")

		if applied[version] {
			fmt.Printf("[x] %s\n", file)
		} else {
			fmt.Printf("[ ] %s\n", file)
		}
	}

	return nil
}

func extractUpMigration(content string) string {
	// Find +migrate Up section
	upIdx := strings.Index(content, "-- +migrate Up")
	downIdx := strings.Index(content, "-- +migrate Down")

	if upIdx == -1 {
		return content
	}

	start := upIdx + len("-- +migrate Up")
	end := len(content)
	if downIdx != -1 && downIdx > upIdx {
		end = downIdx
	}

	return strings.TrimSpace(content[start:end])
}
