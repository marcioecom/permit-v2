package service

import (
	"context"
	"fmt"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
)

type ProjectService struct {
	repo    repository.ProjectRepository
	envRepo repository.EnvironmentRepository
}

func NewProjectService(repo repository.ProjectRepository, envRepo repository.EnvironmentRepository) *ProjectService {
	return &ProjectService{repo: repo, envRepo: envRepo}
}

type CreateProjectInput struct {
	OwnerID          string
	Name             string
	Description      string
	AllowedOrigins   []string
	AllowedProviders []string
}

type CreateProjectOutput struct {
	Project      *models.Project `json:"project"`
	ClientID     string          `json:"clientId"`
	ClientSecret string          `json:"clientSecret"`
}

func (s *ProjectService) CreateProject(ctx context.Context, input CreateProjectInput) (*CreateProjectOutput, error) {
	if input.Name == "" {
		return nil, fmt.Errorf("name_required")
	}

	providers := input.AllowedProviders
	if len(providers) == 0 {
		providers = []string{"email"}
	}

	project := &models.Project{
		ID:               ulid.Make().String(),
		OwnerID:          input.OwnerID,
		Name:             input.Name,
		Description:      &input.Description,
		AllowedOrigins:   input.AllowedOrigins,
		AllowedProviders: providers,
	}

	if err := s.repo.Create(ctx, project); err != nil {
		return nil, err
	}

	// Create default development environment
	env := &models.Environment{
		ID:             ulid.Make().String(),
		ProjectID:      project.ID,
		Name:           "Development",
		Type:           models.EnvTypeDevelopment,
		AllowedOrigins: input.AllowedOrigins,
	}
	if err := s.envRepo.Create(ctx, env); err != nil {
		return nil, err
	}

	clientID := repository.GenerateClientID()
	clientSecret, secretHash, err := repository.GenerateClientSecret()
	if err != nil {
		return nil, err
	}

	apiKey := &models.APIKey{
		ID:               ulid.Make().String(),
		ProjectID:        project.ID,
		EnvironmentID:    env.ID,
		Name:             "Default",
		ClientID:         clientID,
		ClientSecretHash: secretHash,
	}
	if err := s.repo.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &CreateProjectOutput{
		Project:      project,
		ClientID:     clientID,
		ClientSecret: clientSecret,
	}, nil
}

func (s *ProjectService) GetProject(ctx context.Context, id string) (*models.Project, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *ProjectService) DeleteProject(ctx context.Context, projectID, ownerID string) error {
	project, err := s.repo.GetByID(ctx, projectID)
	if err != nil || project == nil {
		return fmt.Errorf("project_not_found")
	}
	if project.OwnerID != ownerID {
		return fmt.Errorf("forbidden")
	}
	return s.repo.DeleteProject(ctx, projectID)
}

type UpdateProjectInput struct {
	ID               string
	Name             string
	Description      string
	AllowedOrigins   []string
	AllowedProviders []string
}

func (s *ProjectService) UpdateProject(ctx context.Context, input UpdateProjectInput) (*models.Project, error) {
	project, err := s.repo.GetByID(ctx, input.ID)
	if err != nil {
		return nil, err
	}
	if project == nil {
		return nil, fmt.Errorf("project_not_found")
	}

	if input.Name != "" {
		project.Name = input.Name
	}
	if input.Description != "" {
		project.Description = &input.Description
	}
	if input.AllowedOrigins != nil {
		project.AllowedOrigins = input.AllowedOrigins
	}
	if input.AllowedProviders != nil {
		project.AllowedProviders = input.AllowedProviders
	}

	if err := s.repo.Update(ctx, project); err != nil {
		return nil, err
	}

	return project, nil
}

func (s *ProjectService) GetWidget(ctx context.Context, projectID string) (*models.Widget, error) {
	return s.repo.GetWidget(ctx, projectID)
}

func (s *ProjectService) GetDefaultEnvironmentID(ctx context.Context, projectID string) string {
	env, err := s.envRepo.GetDefaultForProject(ctx, projectID)
	if err != nil || env == nil {
		return ""
	}
	return env.ID
}

type UpdateWidgetInput struct {
	ProjectID        string
	Title            string
	Subtitle         string
	ThemeConfig      models.ThemeConfig
	EnabledProviders []string
}

func (s *ProjectService) UpdateWidget(ctx context.Context, input UpdateWidgetInput) error {
	widget := &models.Widget{
		ProjectID:        input.ProjectID,
		Title:            input.Title,
		Subtitle:         input.Subtitle,
		ThemeConfig:      input.ThemeConfig,
		EnabledProviders: input.EnabledProviders,
	}
	return s.repo.UpdateWidget(ctx, widget)
}

type CreateAPIKeyInput struct {
	ProjectID     string
	Name          string
	EnvironmentID string
}

type CreateAPIKeyOutput struct {
	ID           string `json:"id"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	Name         string `json:"name"`
}

func (s *ProjectService) CreateAPIKey(ctx context.Context, input CreateAPIKeyInput) (*CreateAPIKeyOutput, error) {
	envID := input.EnvironmentID
	if envID == "" {
		// Resolve default environment for the project
		env, err := s.envRepo.GetDefaultForProject(ctx, input.ProjectID)
		if err != nil {
			return nil, fmt.Errorf("environment_not_found")
		}
		envID = env.ID
	}

	clientID := repository.GenerateClientID()
	clientSecret, secretHash, err := repository.GenerateClientSecret()
	if err != nil {
		return nil, err
	}

	name := input.Name
	if name == "" {
		name = "API Key"
	}

	apiKey := &models.APIKey{
		ID:               ulid.Make().String(),
		ProjectID:        input.ProjectID,
		EnvironmentID:    envID,
		Name:             name,
		ClientID:         clientID,
		ClientSecretHash: secretHash,
	}

	if err := s.repo.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &CreateAPIKeyOutput{
		ID:           apiKey.ID,
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Name:         name,
	}, nil
}

// Dashboard-specific methods

func (s *ProjectService) ListProjectsByOwner(ctx context.Context, ownerID string) ([]models.ProjectWithStats, error) {
	return s.repo.GetProjectsByOwnerID(ctx, ownerID)
}

func (s *ProjectService) GetProjectForOwner(ctx context.Context, projectID, ownerID string) (*models.ProjectWithStats, error) {
	return s.repo.GetProjectStatsByOwnerID(ctx, projectID, ownerID)
}

func (s *ProjectService) ListProjectUsers(ctx context.Context, input models.ListProjectUsersInput) (*models.ListProjectUsersOutput, error) {
	project, err := s.repo.GetByID(ctx, input.ProjectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("project_not_found")
	}
	if project.OwnerID != input.OwnerID {
		return nil, fmt.Errorf("forbidden")
	}

	return s.repo.GetProjectUsers(ctx, input.ProjectID, input.Page, input.Limit, input.Search)
}

func (s *ProjectService) ListAllProjectUsers(ctx context.Context, ownerID string, page, limit int, search string) (*models.ListProjectUsersOutput, error) {
	return s.repo.GetAllProjectUsers(ctx, ownerID, page, limit, search)
}

func (s *ProjectService) ListAPIKeys(ctx context.Context, projectID, ownerID string) ([]models.APIKeyInfo, error) {
	project, err := s.repo.GetByID(ctx, projectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("project_not_found")
	}
	if project.OwnerID != ownerID {
		return nil, fmt.Errorf("forbidden")
	}

	return s.repo.GetAPIKeysByProjectID(ctx, projectID)
}

func (s *ProjectService) ListAuthLogs(ctx context.Context, input models.ListAuthLogsInput) (*models.ListAuthLogsOutput, error) {
	return s.repo.ListAuthLogs(ctx, input)
}

func (s *ProjectService) GetDashboardStats(ctx context.Context, ownerID string) (*models.DashboardStats, error) {
	return s.repo.GetDashboardStats(ctx, ownerID)
}

func (s *ProjectService) GetUserStats(ctx context.Context, ownerID string) (*models.UserStats, error) {
	return s.repo.GetUserStats(ctx, ownerID)
}

func (s *ProjectService) RevokeAPIKey(ctx context.Context, projectID, keyID, ownerID string) (*models.RevokedKeyInfo, error) {
	project, err := s.repo.GetByID(ctx, projectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("project_not_found")
	}
	if project.OwnerID != ownerID {
		return nil, fmt.Errorf("forbidden")
	}

	return s.repo.RevokeAPIKey(ctx, projectID, keyID)
}
