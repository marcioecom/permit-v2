package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

type ProjectHandler struct {
	service *service.ProjectService
}

func NewProjectHandler(projectService *service.ProjectService) *ProjectHandler {
	return &ProjectHandler{service: projectService}
}

type CreateProjectRequest struct {
	Name             string   `json:"name" validate:"required"`
	Description      string   `json:"description"`
	AllowedOrigins   []string `json:"allowedOrigins"`
	AllowedProviders []string `json:"allowedProviders"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req CreateProjectRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	output, err := h.service.CreateProject(r.Context(), service.CreateProjectInput{
		OwnerID:          ownerID,
		Name:             req.Name,
		Description:      req.Description,
		AllowedOrigins:   req.AllowedOrigins,
		AllowedProviders: req.AllowedProviders,
	})
	if err != nil {
		log.Error().Err(err).Msg("Failed to create project")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to create project")
		return
	}

	writeSuccess(w, http.StatusCreated, output)
}

func (h *ProjectHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id_required", "Project ID is required")
		return
	}

	project, err := h.service.GetProject(r.Context(), id)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get project")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to get project")
		return
	}
	if project == nil {
		writeError(w, http.StatusNotFound, "not_found", "Project not found")
		return
	}

	writeSuccess(w, http.StatusOK, project)
}

type UpdateProjectRequest struct {
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	AllowedOrigins   []string `json:"allowedOrigins"`
	AllowedProviders []string `json:"allowedProviders"`
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "id_required", "Project ID is required")
		return
	}

	var req UpdateProjectRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	project, err := h.service.UpdateProject(r.Context(), service.UpdateProjectInput{
		ID:               id,
		Name:             req.Name,
		Description:      req.Description,
		AllowedOrigins:   req.AllowedOrigins,
		AllowedProviders: req.AllowedProviders,
	})
	if err != nil {
		if err.Error() == "project_not_found" {
			writeError(w, http.StatusNotFound, "not_found", "Project not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to update project")
		return
	}

	writeSuccess(w, http.StatusOK, project)
}

func (h *ProjectHandler) GetWidget(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	widget, err := h.service.GetWidget(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to get widget")
		return
	}

	defaultEnvID := h.service.GetDefaultEnvironmentID(r.Context(), id)

	if widget == nil {
		writeSuccess(w, http.StatusOK, map[string]any{
			"projectId":            id,
			"title":                "Welcome",
			"subtitle":             "",
			"enabledProviders":     []string{"email"},
			"defaultEnvironmentId": defaultEnvID,
		})
		return
	}

	// Wrap widget with defaultEnvironmentId
	type widgetResponse struct {
		*models.Widget
		DefaultEnvironmentID string `json:"defaultEnvironmentId"`
	}
	writeSuccess(w, http.StatusOK, widgetResponse{
		Widget:               widget,
		DefaultEnvironmentID: defaultEnvID,
	})
}

type UpdateWidgetRequest struct {
	Title            string             `json:"title"`
	Subtitle         string             `json:"subtitle"`
	ThemeConfig      models.ThemeConfig `json:"themeConfig"`
	EnabledProviders []string           `json:"enabledProviders"`
}

func (h *ProjectHandler) UpdateWidget(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req UpdateWidgetRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	if err := h.service.UpdateWidget(r.Context(), service.UpdateWidgetInput{
		ProjectID:        id,
		Title:            req.Title,
		Subtitle:         req.Subtitle,
		ThemeConfig:      req.ThemeConfig,
		EnabledProviders: req.EnabledProviders,
	}); err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to update widget")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"message": "Widget updated"})
}

type CreateAPIKeyRequest struct {
	Name string `json:"name"`
}

func (h *ProjectHandler) CreateAPIKey(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req CreateAPIKeyRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	output, err := h.service.CreateAPIKey(r.Context(), service.CreateAPIKeyInput{
		ProjectID: id,
		Name:      req.Name,
	})
	if err != nil {
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to create API key")
		return
	}

	writeSuccess(w, http.StatusCreated, output)
}
