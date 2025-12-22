package handler

import (
	"net/http"

	"github.com/marcioecom/permit/internal/service"
)

type ProjectHandler struct {
	service *service.ProjectService
}

func NewProjectHandler(projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{}
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request)  {}
func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {}
