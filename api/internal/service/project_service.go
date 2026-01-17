package service

import (
	"context"
	"fmt"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
)

type ProjectService struct {
	repo repository.ProjectRepository
}

func NewProjectService(repo repository.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
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
		Description:      input.Description,
		AllowedOrigins:   input.AllowedOrigins,
		AllowedProviders: providers,
	}

	if err := s.repo.Create(ctx, project); err != nil {
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
		project.Description = input.Description
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
	ProjectID string
	Name      string
}

type CreateAPIKeyOutput struct {
	ID           string `json:"id"`
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	Name         string `json:"name"`
}

func (s *ProjectService) CreateAPIKey(ctx context.Context, input CreateAPIKeyInput) (*CreateAPIKeyOutput, error) {
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
