package repository

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math"
	"time"

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
	// Dashboard methods
	GetProjectsByOwnerID(ctx context.Context, ownerID string) ([]models.ProjectWithStats, error)
	GetProjectStatsByOwnerID(ctx context.Context, projectID string, ownerID string) (*models.ProjectWithStats, error)
	GetProjectUsers(ctx context.Context, projectID string, page, limit int, search string) (*models.ListProjectUsersOutput, error)
	GetAllProjectUsers(ctx context.Context, ownerID string, page, limit int, search string) (*models.ListProjectUsersOutput, error)
	GetAPIKeysByProjectID(ctx context.Context, projectID string) ([]models.APIKeyInfo, error)
	RevokeAPIKey(ctx context.Context, projectID, keyID string) (*models.RevokedKeyInfo, error)
	// Auth log methods
	InsertAuthLog(ctx context.Context, log *models.AuthLog) error
	ListAuthLogs(ctx context.Context, input models.ListAuthLogsInput) (*models.ListAuthLogsOutput, error)
	GetDashboardStats(ctx context.Context, ownerID string) (*models.DashboardStats, error)
	GetUserStats(ctx context.Context, ownerID string) (*models.UserStats, error)
	UpsertProjectUser(ctx context.Context, projectID, environmentID, userID, provider string) error
	DeleteProject(ctx context.Context, projectID string) error
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

	if err = json.Unmarshal(themeJSON, &w.ThemeConfig); err != nil {
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
		INSERT INTO project_api_keys (id, project_id, environment_id, name, client_id, client_secret_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err := r.db.Exec(ctx, query, key.ID, key.ProjectID, key.EnvironmentID, key.Name, key.ClientID, key.ClientSecretHash)
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

// Dashboard methods

func (r *postgresProjectRepo) GetProjectsByOwnerID(ctx context.Context, ownerID string) ([]models.ProjectWithStats, error) {
	query := `
		SELECT
			p.id, p.name, p.description,
			COUNT(DISTINCT pu.user_id) as user_count,
			p.created_at, p.updated_at
		FROM projects p
		LEFT JOIN project_users pu ON p.id = pu.project_id
		WHERE p.owner_id = $1
		GROUP BY p.id
		ORDER BY p.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.ProjectWithStats
	for rows.Next() {
		var p models.ProjectWithStats
		var createdAt, updatedAt time.Time
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.UserCount, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		p.CreatedAt = createdAt.Format(time.RFC3339)
		p.UpdatedAt = updatedAt.Format(time.RFC3339)
		projects = append(projects, p)
	}
	if projects == nil {
		projects = []models.ProjectWithStats{}
	}
	return projects, rows.Err()
}

func (r *postgresProjectRepo) GetProjectStatsByOwnerID(ctx context.Context, projectID string, ownerID string) (*models.ProjectWithStats, error) {
	query := `
		SELECT
			p.id,
			p.name,
			p.description,
			p.created_at,
			p.updated_at,
			COUNT(DISTINCT pu.user_id) as user_count
		FROM projects p
		LEFT JOIN project_users pu ON p.id = pu.project_id
		WHERE p.id = $1 AND p.owner_id = $2
		GROUP BY p.id
	`
	stats := &models.ProjectWithStats{}
	var createdAt, updatedAt time.Time
	err := r.db.QueryRow(ctx, query, projectID, ownerID).Scan(&stats.ID, &stats.Name, &stats.Description, &createdAt, &updatedAt, &stats.UserCount)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	stats.CreatedAt = createdAt.Format(time.RFC3339)
	stats.UpdatedAt = updatedAt.Format(time.RFC3339)
	return stats, nil
}

func (r *postgresProjectRepo) GetProjectUsers(ctx context.Context, projectID string, page, limit int, search string) (*models.ListProjectUsersOutput, error) {
	offset := (page - 1) * limit

	// Count total
	countQuery := `SELECT COUNT(*) FROM project_users pu JOIN users u ON pu.user_id = u.id WHERE pu.project_id = $1`
	args := []any{projectID}
	if search != "" {
		countQuery += ` AND u.email ILIKE $2`
		args = append(args, "%"+search+"%")
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Get users
	query := `
		SELECT u.id, u.email, pu.name, p.name, pu.last_auth_provider, COALESCE(pu.login_count, 0), pu.created_at, pu.last_login
		FROM project_users pu
		JOIN users u ON pu.user_id = u.id
		JOIN projects p ON pu.project_id = p.id
		WHERE pu.project_id = $1 AND pu.blocked_at IS NULL
	`
	if search != "" {
		query += ` AND u.email ILIKE $4`
	}
	query += ` ORDER BY pu.last_login DESC NULLS LAST LIMIT $2 OFFSET $3`

	queryArgs := []any{projectID, limit, offset}
	if search != "" {
		queryArgs = append(queryArgs, "%"+search+"%")
	}

	rows, err := r.db.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.ProjectUserInfo
	for rows.Next() {
		var u models.ProjectUserInfo
		var createdAt time.Time
		var lastLogin *time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.ProjectName, &u.AuthMethod, &u.LoginCount, &createdAt, &lastLogin); err != nil {
			return nil, err
		}
		u.CreatedAt = createdAt.Format(time.RFC3339)
		if lastLogin != nil {
			formatted := lastLogin.Format(time.RFC3339)
			u.LastLoginAt = &formatted
		}
		users = append(users, u)
	}
	if users == nil {
		users = []models.ProjectUserInfo{}
	}

	totalPages := (total + limit - 1) / limit
	result := &models.ListProjectUsersOutput{
		Data: users,
	}
	result.Meta.Page = page
	result.Meta.Limit = limit
	result.Meta.Total = total
	result.Meta.TotalPages = totalPages

	return result, rows.Err()
}

func (r *postgresProjectRepo) GetAllProjectUsers(ctx context.Context, ownerID string, page, limit int, search string) (*models.ListProjectUsersOutput, error) {
	offset := (page - 1) * limit

	// Count total
	countQuery := `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN users u ON pu.user_id = u.id
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.blocked_at IS NULL
	`
	args := []any{ownerID}
	if search != "" {
		countQuery += ` AND u.email ILIKE $2`
		args = append(args, "%"+search+"%")
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}

	// Get users
	query := `
		SELECT u.id, u.email, pu.name, p.name, pu.last_auth_provider, COALESCE(pu.login_count, 0), pu.created_at, pu.last_login
		FROM project_users pu
		JOIN users u ON pu.user_id = u.id
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.blocked_at IS NULL
	`
	if search != "" {
		query += ` AND u.email ILIKE $4`
	}
	query += ` ORDER BY pu.last_login DESC NULLS LAST LIMIT $2 OFFSET $3`

	queryArgs := []any{ownerID, limit, offset}
	if search != "" {
		queryArgs = append(queryArgs, "%"+search+"%")
	}

	rows, err := r.db.Query(ctx, query, queryArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []models.ProjectUserInfo
	for rows.Next() {
		var u models.ProjectUserInfo
		var createdAt time.Time
		var lastLogin *time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.ProjectName, &u.AuthMethod, &u.LoginCount, &createdAt, &lastLogin); err != nil {
			return nil, err
		}
		u.CreatedAt = createdAt.Format(time.RFC3339)
		if lastLogin != nil {
			formatted := lastLogin.Format(time.RFC3339)
			u.LastLoginAt = &formatted
		}
		users = append(users, u)
	}
	if users == nil {
		users = []models.ProjectUserInfo{}
	}

	totalPages := (total + limit - 1) / limit
	result := &models.ListProjectUsersOutput{
		Data: users,
	}
	result.Meta.Page = page
	result.Meta.Limit = limit
	result.Meta.Total = total
	result.Meta.TotalPages = totalPages

	return result, rows.Err()
}

func (r *postgresProjectRepo) GetAPIKeysByProjectID(ctx context.Context, projectID string) ([]models.APIKeyInfo, error) {
	query := `
		SELECT k.id, k.name, k.client_id, k.client_secret_hash, k.last_used_at, k.created_at, COALESCE(e.name, '') as env_name
		FROM project_api_keys k
		LEFT JOIN environments e ON e.id = k.environment_id
		WHERE k.project_id = $1
		ORDER BY k.created_at DESC
	`
	rows, err := r.db.Query(ctx, query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var keys []models.APIKeyInfo
	for rows.Next() {
		var k models.APIKeyInfo
		var secretHash string
		var createdAt time.Time
		var lastUsed *time.Time
		if err := rows.Scan(&k.ID, &k.Name, &k.ClientID, &secretHash, &lastUsed, &createdAt, &k.EnvironmentName); err != nil {
			return nil, err
		}
		// Mask the secret
		k.ClientSecretMasked = "sk_***" + k.ClientID[len(k.ClientID)-4:]
		k.CreatedAt = createdAt.Format(time.RFC3339)
		if lastUsed != nil {
			formatted := lastUsed.Format(time.RFC3339)
			k.LastUsedAt = &formatted
		}
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []models.APIKeyInfo{}
	}
	return keys, rows.Err()
}

func (r *postgresProjectRepo) RevokeAPIKey(ctx context.Context, projectID, keyID string) (*models.RevokedKeyInfo, error) {
	query := `
		UPDATE project_api_keys
		SET status = 'revoked', revoked_at = NOW()
		WHERE id = $1 AND project_id = $2
		RETURNING id, status, revoked_at
	`
	var info models.RevokedKeyInfo
	var revokedAt time.Time
	err := r.db.QueryRow(ctx, query, keyID, projectID).Scan(&info.ID, &info.Status, &revokedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	info.RevokedAt = revokedAt.Format(time.RFC3339)
	return &info, nil
}

// Auth log methods

func (r *postgresProjectRepo) InsertAuthLog(ctx context.Context, log *models.AuthLog) error {
	if log.Metadata == nil {
		log.Metadata = map[string]string{}
	}

	query := `
		INSERT INTO auth_logs (id, project_id, user_id, user_email, event_type, status, ip_address, user_agent, metadata, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
	`
	_, err := r.db.Exec(ctx, query,
		log.ID, log.ProjectID, log.UserID, log.UserEmail,
		log.EventType, log.Status, log.IPAddress, log.UserAgent,
		log.Metadata, log.CreatedAt,
	)
	return err
}

func (r *postgresProjectRepo) ListAuthLogs(ctx context.Context, input models.ListAuthLogsInput) (*models.ListAuthLogsOutput, error) {
	// Build date filter
	var dateFilter string
	switch input.DateRange {
	case "24h":
		dateFilter = "AND al.created_at >= NOW() - INTERVAL '24 hours'"
	case "7d":
		dateFilter = "AND al.created_at >= NOW() - INTERVAL '7 days'"
	case "30d":
		dateFilter = "AND al.created_at >= NOW() - INTERVAL '30 days'"
	default:
		dateFilter = "AND al.created_at >= NOW() - INTERVAL '24 hours'"
	}

	// Count query
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM auth_logs al
		JOIN projects p ON al.project_id = p.id
		WHERE p.owner_id = $1 %s
	`, dateFilter)
	countArgs := []any{input.OwnerID}
	argIdx := 2

	if input.ProjectID != "" {
		countQuery = fmt.Sprintf(`
			SELECT COUNT(*)
			FROM auth_logs al
			JOIN projects p ON al.project_id = p.id
			WHERE p.owner_id = $1 AND al.project_id = $%d %s
		`, argIdx, dateFilter)
		countArgs = append(countArgs, input.ProjectID)
		argIdx++
	}
	if input.EventType != "" {
		countQuery += fmt.Sprintf(` AND al.event_type = $%d`, argIdx)
		countArgs = append(countArgs, input.EventType)
		argIdx++
	}

	var total int
	if err := r.db.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, err
	}

	// Data query
	offset := (input.Page - 1) * input.Limit
	dataQuery := fmt.Sprintf(`
		SELECT al.id, al.event_type, al.user_email, al.project_id, p.name, al.status, COALESCE(al.metadata->>'provider', 'email'), COALESCE(al.ip_address, ''), al.created_at
		FROM auth_logs al
		JOIN projects p ON al.project_id = p.id
		WHERE p.owner_id = $1 %s
	`, dateFilter)
	dataArgs := []any{input.OwnerID}
	dataArgIdx := 2

	if input.ProjectID != "" {
		dataQuery = fmt.Sprintf(`
			SELECT al.id, al.event_type, al.user_email, al.project_id, p.name, al.status, COALESCE(al.metadata->>'provider', 'email'), COALESCE(al.ip_address, ''), al.created_at
			FROM auth_logs al
			JOIN projects p ON al.project_id = p.id
			WHERE p.owner_id = $1 AND al.project_id = $%d %s
		`, dataArgIdx, dateFilter)
		dataArgs = append(dataArgs, input.ProjectID)
		dataArgIdx++
	}
	if input.EventType != "" {
		dataQuery += fmt.Sprintf(` AND al.event_type = $%d`, dataArgIdx)
		dataArgs = append(dataArgs, input.EventType)
		dataArgIdx++
	}

	dataQuery += fmt.Sprintf(` ORDER BY al.created_at DESC LIMIT $%d OFFSET $%d`, dataArgIdx, dataArgIdx+1)
	dataArgs = append(dataArgs, input.Limit, offset)

	rows, err := r.db.Query(ctx, dataQuery, dataArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []models.AuthLogResponse
	for rows.Next() {
		var l models.AuthLogResponse
		var createdAt time.Time
		if err := rows.Scan(&l.ID, &l.EventType, &l.UserEmail, &l.ProjectID, &l.ProjectName, &l.Status, &l.AuthProvider, &l.IPAddress, &createdAt); err != nil {
			return nil, err
		}
		l.Timestamp = createdAt.Format(time.RFC3339)
		logs = append(logs, l)
	}
	if logs == nil {
		logs = []models.AuthLogResponse{}
	}

	totalPages := (total + input.Limit - 1) / input.Limit
	return &models.ListAuthLogsOutput{
		Data: logs,
		Meta: models.PaginationMeta{
			Page:       input.Page,
			Limit:      input.Limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}, rows.Err()
}

func (r *postgresProjectRepo) GetDashboardStats(ctx context.Context, ownerID string) (*models.DashboardStats, error) {
	stats := &models.DashboardStats{}

	// Active projects count
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE owner_id = $1`, ownerID).Scan(&stats.ActiveProjects)
	if err != nil {
		return nil, err
	}

	// Projects created in last 7 days
	var recentProjects int
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE owner_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`, ownerID).Scan(&recentProjects)
	if err != nil {
		return nil, err
	}
	if recentProjects > 0 {
		stats.ProjectsChange = fmt.Sprintf("+%d this week", recentProjects)
	} else {
		stats.ProjectsChange = "No change"
	}

	// Monthly users (distinct users across owner's projects in last 30d)
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.last_login >= NOW() - INTERVAL '30 days'
	`, ownerID).Scan(&stats.MonthlyUsers)
	if err != nil {
		return nil, err
	}

	// Previous 30d users for comparison
	var prevMonthUsers int
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.last_login >= NOW() - INTERVAL '60 days' AND pu.last_login < NOW() - INTERVAL '30 days'
	`, ownerID).Scan(&prevMonthUsers)
	if err != nil {
		return nil, err
	}
	if prevMonthUsers > 0 {
		change := float64(stats.MonthlyUsers-prevMonthUsers) / float64(prevMonthUsers) * 100
		if change >= 0 {
			stats.UsersChange = fmt.Sprintf("+%.0f%% vs last mo", change)
		} else {
			stats.UsersChange = fmt.Sprintf("%.0f%% vs last mo", change)
		}
	} else if stats.MonthlyUsers > 0 {
		stats.UsersChange = "New users"
	} else {
		stats.UsersChange = "No data"
	}

	// API requests (auth_logs in last 30d)
	var apiRequests int
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*)
		FROM auth_logs al
		JOIN projects p ON al.project_id = p.id
		WHERE p.owner_id = $1 AND al.created_at >= NOW() - INTERVAL '30 days'
	`, ownerID).Scan(&apiRequests)
	if err != nil {
		return nil, err
	}
	stats.APIRequests = formatCount(apiRequests)

	// Auth success rate
	var totalLogs, successLogs int
	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE al.status != 'OTP_SENT'),
			COUNT(*) FILTER (WHERE al.status = 'SUCCESS')
		FROM auth_logs al
		JOIN projects p ON al.project_id = p.id
		WHERE p.owner_id = $1 AND al.created_at >= NOW() - INTERVAL '30 days'
	`, ownerID).Scan(&totalLogs, &successLogs)
	if err != nil {
		return nil, err
	}
	if totalLogs > 0 {
		rate := float64(successLogs) / float64(totalLogs) * 100
		stats.AuthSuccessRate = fmt.Sprintf("%.1f%%", rate)
	} else {
		stats.AuthSuccessRate = "N/A"
	}

	return stats, nil
}

func (r *postgresProjectRepo) GetUserStats(ctx context.Context, ownerID string) (*models.UserStats, error) {
	stats := &models.UserStats{}

	// Total users
	err := r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1
	`, ownerID).Scan(&stats.TotalUsers)
	if err != nil {
		return nil, err
	}

	// Active in 24h
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.last_login >= NOW() - INTERVAL '24 hours'
	`, ownerID).Scan(&stats.ActiveIn24h)
	if err != nil {
		return nil, err
	}

	// Verification rate from auth_logs
	var totalOTP, successOTP int
	err = r.db.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE al.event_type = 'login' AND al.status IN ('SUCCESS', 'FAILED', 'EXPIRED')),
			COUNT(*) FILTER (WHERE al.event_type = 'login' AND al.status = 'SUCCESS')
		FROM auth_logs al
		JOIN projects p ON al.project_id = p.id
		WHERE p.owner_id = $1
	`, ownerID).Scan(&totalOTP, &successOTP)
	if err != nil {
		return nil, err
	}
	if totalOTP > 0 {
		rate := float64(successOTP) / float64(totalOTP) * 100
		stats.VerificationRate = fmt.Sprintf("%.1f%%", rate)
	} else {
		stats.VerificationRate = "N/A"
	}

	// Blocked users
	err = r.db.QueryRow(ctx, `
		SELECT COUNT(DISTINCT pu.user_id)
		FROM project_users pu
		JOIN projects p ON pu.project_id = p.id
		WHERE p.owner_id = $1 AND pu.blocked_at IS NOT NULL
	`, ownerID).Scan(&stats.BlockedUsers)
	if err != nil {
		return nil, err
	}

	return stats, nil
}

func (r *postgresProjectRepo) UpsertProjectUser(ctx context.Context, projectID, environmentID, userID, provider string) error {
	query := `
		INSERT INTO project_users (user_id, project_id, environment_id, last_login, login_count, last_auth_provider, created_at)
		VALUES ($1, $2, $3, NOW(), 1, $4, NOW())
		ON CONFLICT (user_id, environment_id) DO UPDATE SET
			last_login = NOW(),
			login_count = project_users.login_count + 1,
			last_auth_provider = $4
	`
	_, err := r.db.Exec(ctx, query, userID, projectID, environmentID, provider)
	return err
}

func formatCount(n int) string {
	if n < 1000 {
		return fmt.Sprintf("%d", n)
	}
	if n < 1000000 {
		v := float64(n) / 1000
		if math.Mod(v, 1) == 0 {
			return fmt.Sprintf("%.0fk", v)
		}
		return fmt.Sprintf("%.1fk", v)
	}
	v := float64(n) / 1000000
	return fmt.Sprintf("%.1fM", v)
}

func (r *postgresProjectRepo) DeleteProject(ctx context.Context, projectID string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Delete in dependency order
	queries := []string{
		`DELETE FROM oauth_authorization_codes WHERE environment_id IN (SELECT id FROM environments WHERE project_id = $1)`,
		`DELETE FROM oauth_states WHERE environment_id IN (SELECT id FROM environments WHERE project_id = $1)`,
		`DELETE FROM oauth_provider_configs WHERE environment_id IN (SELECT id FROM environments WHERE project_id = $1)`,
		`DELETE FROM auth_logs WHERE project_id = $1`,
		`DELETE FROM otp_codes WHERE project_id = $1`,
		`DELETE FROM project_users WHERE project_id = $1`,
		`DELETE FROM project_api_keys WHERE project_id = $1`,
		`DELETE FROM widgets WHERE project_id = $1`,
		`DELETE FROM environments WHERE project_id = $1`,
		`DELETE FROM projects WHERE id = $1`,
	}

	for _, q := range queries {
		if _, err := tx.Exec(ctx, q, projectID); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}
