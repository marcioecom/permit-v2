package service

import (
	"context"
	"fmt"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
)

type EnvironmentService struct {
	envRepo     repository.EnvironmentRepository
	oauthRepo   repository.OAuthRepository
	projectRepo repository.ProjectRepository
}

func NewEnvironmentService(
	envRepo repository.EnvironmentRepository,
	oauthRepo repository.OAuthRepository,
	projectRepo repository.ProjectRepository,
) *EnvironmentService {
	return &EnvironmentService{
		envRepo:     envRepo,
		oauthRepo:   oauthRepo,
		projectRepo: projectRepo,
	}
}

type CreateEnvironmentInput struct {
	ProjectID string
	Name      string
	Type      string
	OwnerID   string
}

func (s *EnvironmentService) Create(ctx context.Context, input CreateEnvironmentInput) (*models.Environment, error) {
	project, err := s.projectRepo.GetByID(ctx, input.ProjectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("project_not_found")
	}
	if project.OwnerID != input.OwnerID {
		return nil, fmt.Errorf("forbidden")
	}

	switch input.Type {
	case models.EnvTypeDevelopment, models.EnvTypeStaging, models.EnvTypeProduction:
	default:
		return nil, fmt.Errorf("invalid_environment_type")
	}

	env := &models.Environment{
		ID:        ulid.Make().String(),
		ProjectID: input.ProjectID,
		Name:      input.Name,
		Type:      input.Type,
	}

	if err := s.envRepo.Create(ctx, env); err != nil {
		return nil, err
	}

	return s.envRepo.GetByID(ctx, env.ID)
}

func (s *EnvironmentService) ListByProject(ctx context.Context, projectID, ownerID string) ([]*models.Environment, error) {
	project, err := s.projectRepo.GetByID(ctx, projectID)
	if err != nil || project == nil {
		return nil, fmt.Errorf("project_not_found")
	}
	if project.OwnerID != ownerID {
		return nil, fmt.Errorf("forbidden")
	}
	return s.envRepo.GetByProjectID(ctx, projectID)
}

func (s *EnvironmentService) GetByID(ctx context.Context, envID, ownerID string) (*models.Environment, error) {
	env, err := s.envRepo.GetByID(ctx, envID)
	if err != nil {
		return nil, fmt.Errorf("environment_not_found")
	}
	project, err := s.projectRepo.GetByID(ctx, env.ProjectID)
	if err != nil || project == nil || project.OwnerID != ownerID {
		return nil, fmt.Errorf("forbidden")
	}
	return env, nil
}

type UpdateEnvironmentInput struct {
	EnvironmentID  string
	Name           *string
	AllowedOrigins []string
	OwnerID        string
}

func (s *EnvironmentService) Update(ctx context.Context, input UpdateEnvironmentInput) (*models.Environment, error) {
	env, err := s.envRepo.GetByID(ctx, input.EnvironmentID)
	if err != nil {
		return nil, fmt.Errorf("environment_not_found")
	}
	project, err := s.projectRepo.GetByID(ctx, env.ProjectID)
	if err != nil || project == nil || project.OwnerID != input.OwnerID {
		return nil, fmt.Errorf("forbidden")
	}

	if input.Name != nil {
		env.Name = *input.Name
	}
	if input.AllowedOrigins != nil {
		env.AllowedOrigins = input.AllowedOrigins
	}

	if err := s.envRepo.Update(ctx, env); err != nil {
		return nil, err
	}
	return s.envRepo.GetByID(ctx, env.ID)
}

// OAuth provider config management

func (s *EnvironmentService) ListOAuthProviders(ctx context.Context, envID, ownerID string) ([]*models.OAuthProviderConfig, error) {
	if _, err := s.GetByID(ctx, envID, ownerID); err != nil {
		return nil, err
	}
	return s.oauthRepo.ListProviderConfigs(ctx, envID)
}

type UpsertOAuthProviderInput struct {
	EnvironmentID string
	Provider      string
	Enabled       bool
	ClientID      *string
	ClientSecret  *string
	OwnerID       string
}

func (s *EnvironmentService) UpsertOAuthProvider(ctx context.Context, input UpsertOAuthProviderInput) (*models.OAuthProviderConfig, error) {
	env, err := s.GetByID(ctx, input.EnvironmentID, input.OwnerID)
	if err != nil {
		return nil, err
	}

	// Production environments require custom credentials to enable
	if env.Type != models.EnvTypeDevelopment && input.Enabled {
		if input.ClientID == nil || *input.ClientID == "" {
			return nil, fmt.Errorf("production_requires_credentials")
		}
		if input.ClientSecret == nil || *input.ClientSecret == "" {
			return nil, fmt.Errorf("production_requires_credentials")
		}
	}

	scopes := models.DefaultOAuthScopes[input.Provider]
	if scopes == nil {
		return nil, fmt.Errorf("unsupported_provider")
	}

	config := &models.OAuthProviderConfig{
		ID:            ulid.Make().String(),
		EnvironmentID: input.EnvironmentID,
		Provider:      input.Provider,
		Enabled:       input.Enabled,
		ClientID:      input.ClientID,
		Scopes:        scopes,
	}
	if input.ClientSecret != nil {
		config.ClientSecretEncrypted = input.ClientSecret
	}

	if err := s.oauthRepo.UpsertProviderConfig(ctx, config); err != nil {
		return nil, err
	}

	return s.oauthRepo.GetProviderConfig(ctx, input.EnvironmentID, input.Provider)
}

func (s *EnvironmentService) DeleteOAuthProvider(ctx context.Context, envID, provider, ownerID string) error {
	if _, err := s.GetByID(ctx, envID, ownerID); err != nil {
		return err
	}
	return s.oauthRepo.DeleteProviderConfig(ctx, envID, provider)
}
