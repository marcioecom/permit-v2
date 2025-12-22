package service

import (
	"context"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
)

type ProjectService struct {
	repo repository.ProjectRepository
}

func NewProjectService(repo repository.ProjectRepository) *ProjectService {
	return &ProjectService{repo: repo}
}

type CreateProjectInput struct{}

func (s *ProjectService) CreateProject(ctx context.Context, input CreateProjectInput) (*models.Project, error) {
	// 1. Valida input
	// 2. Gera secrets
	// 3. Chama o repo
	p := &models.Project{ /* ... */ }
	return p, s.repo.Create(ctx, p)
}
