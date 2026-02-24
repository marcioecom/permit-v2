package handler

import (
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

type DashboardHandler struct {
	projectService     *service.ProjectService
	environmentService *service.EnvironmentService
}

func NewDashboardHandler(projectService *service.ProjectService, environmentService *service.EnvironmentService) *DashboardHandler {
	return &DashboardHandler{
		projectService:     projectService,
		environmentService: environmentService,
	}
}

func (h *DashboardHandler) ListProjects(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	projects, err := h.projectService.ListProjectsByOwner(r.Context(), ownerID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list projects")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list projects")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"data": projects,
		"meta": map[string]int{"total": len(projects)},
	})
}

func (h *DashboardHandler) GetProject(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	project, err := h.projectService.GetProjectForOwner(r.Context(), projectID, ownerID)
	if err != nil {
		if err.Error() == "project_not_found" || err.Error() == "forbidden" {
			writeError(w, http.StatusNotFound, "not_found", "Project not found")
			return
		}
		log.Error().Err(err).Msg("Failed to get project")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to get project")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]any{"data": project})
}

func (h *DashboardHandler) ListProjectUsers(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	search := r.URL.Query().Get("search")

	result, err := h.projectService.ListProjectUsers(r.Context(), models.ListProjectUsersInput{
		ProjectID: projectID,
		OwnerID:   ownerID,
		Page:      page,
		Limit:     limit,
		Search:    search,
	})
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to list project users")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list users")
		return
	}

	writeSuccess(w, http.StatusOK, result)
}

func (h *DashboardHandler) ListAllUsers(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 50
	}
	search := r.URL.Query().Get("search")

	result, err := h.projectService.ListAllProjectUsers(r.Context(), ownerID, page, limit, search)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list all users")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list users")
		return
	}

	writeSuccess(w, http.StatusOK, result)
}

func (h *DashboardHandler) ListAPIKeys(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	keys, err := h.projectService.ListAPIKeys(r.Context(), projectID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to list API keys")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list API keys")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"data": keys,
		"meta": map[string]int{"total": len(keys)},
	})
}

func (h *DashboardHandler) ListAuthLogs(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	input := models.ListAuthLogsInput{
		OwnerID:   ownerID,
		ProjectID: r.URL.Query().Get("projectId"),
		EventType: r.URL.Query().Get("eventType"),
		DateRange: r.URL.Query().Get("dateRange"),
		Page:      page,
		Limit:     limit,
	}

	result, err := h.projectService.ListAuthLogs(r.Context(), input)
	if err != nil {
		log.Error().Err(err).Msg("Failed to list auth logs")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list auth logs")
		return
	}

	writeSuccess(w, http.StatusOK, result)
}

func (h *DashboardHandler) GetDashboardStats(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	stats, err := h.projectService.GetDashboardStats(r.Context(), ownerID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get dashboard stats")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to get dashboard stats")
		return
	}

	writeSuccess(w, http.StatusOK, stats)
}

func (h *DashboardHandler) GetUserStats(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	if ownerID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	stats, err := h.projectService.GetUserStats(r.Context(), ownerID)
	if err != nil {
		log.Error().Err(err).Msg("Failed to get user stats")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to get user stats")
		return
	}

	writeSuccess(w, http.StatusOK, stats)
}

func (h *DashboardHandler) RevokeAPIKey(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")
	keyID := chi.URLParam(r, "keyId")

	result, err := h.projectService.RevokeAPIKey(r.Context(), projectID, keyID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		if err.Error() == "not_found" {
			writeError(w, http.StatusNotFound, "not_found", "API key not found")
			return
		}
		log.Error().Err(err).Msg("Failed to revoke API key")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to revoke API key")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]any{
		"data":    result,
		"message": "API key has been revoked",
	})
}

func (h *DashboardHandler) DeleteProject(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	err := h.projectService.DeleteProject(r.Context(), projectID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		if err.Error() == "project_not_found" {
			writeError(w, http.StatusNotFound, "not_found", "Project not found")
			return
		}
		log.Error().Err(err).Msg("Failed to delete project")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to delete project")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"message": "Project deleted"})
}

// --- Environment endpoints ---

func (h *DashboardHandler) ListEnvironments(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	envs, err := h.environmentService.ListByProject(r.Context(), projectID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to list environments")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list environments")
		return
	}

	writeSuccess(w, http.StatusOK, envs)
}

type CreateEnvironmentRequest struct {
	Name string `json:"name" validate:"required"`
	Type string `json:"type" validate:"required,oneof=development staging production"`
}

func (h *DashboardHandler) CreateEnvironment(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "id")

	var req CreateEnvironmentRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	env, err := h.environmentService.Create(r.Context(), service.CreateEnvironmentInput{
		ProjectID: projectID,
		Name:      req.Name,
		Type:      req.Type,
		OwnerID:   ownerID,
	})
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to create environment")
		writeError(w, http.StatusBadRequest, "creation_failed", err.Error())
		return
	}

	writeSuccess(w, http.StatusCreated, env)
}

func (h *DashboardHandler) GetEnvironment(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	envID := chi.URLParam(r, "envId")

	env, err := h.environmentService.GetByID(r.Context(), envID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		writeError(w, http.StatusNotFound, "not_found", "Environment not found")
		return
	}

	writeSuccess(w, http.StatusOK, env)
}

type UpdateEnvironmentRequest struct {
	Name           *string  `json:"name"`
	AllowedOrigins []string `json:"allowedOrigins"`
}

func (h *DashboardHandler) UpdateEnvironment(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	envID := chi.URLParam(r, "envId")

	var req UpdateEnvironmentRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	env, err := h.environmentService.Update(r.Context(), service.UpdateEnvironmentInput{
		EnvironmentID:  envID,
		Name:           req.Name,
		AllowedOrigins: req.AllowedOrigins,
		OwnerID:        ownerID,
	})
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to update environment")
		writeError(w, http.StatusBadRequest, "update_failed", err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, env)
}

// --- OAuth Provider Config endpoints ---

func (h *DashboardHandler) ListOAuthProviders(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	envID := chi.URLParam(r, "envId")

	configs, err := h.environmentService.ListOAuthProviders(r.Context(), envID, ownerID)
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to list OAuth providers")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to list OAuth providers")
		return
	}

	writeSuccess(w, http.StatusOK, configs)
}

type UpsertOAuthProviderRequest struct {
	Provider     string  `json:"provider" validate:"required,oneof=google github"`
	Enabled      bool    `json:"enabled"`
	ClientID     *string `json:"clientId"`
	ClientSecret *string `json:"clientSecret"`
}

func (h *DashboardHandler) UpsertOAuthProvider(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	envID := chi.URLParam(r, "envId")

	var req UpsertOAuthProviderRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	config, err := h.environmentService.UpsertOAuthProvider(r.Context(), service.UpsertOAuthProviderInput{
		EnvironmentID: envID,
		Provider:      req.Provider,
		Enabled:       req.Enabled,
		ClientID:      req.ClientID,
		ClientSecret:  req.ClientSecret,
		OwnerID:       ownerID,
	})
	if err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to upsert OAuth provider")
		writeError(w, http.StatusBadRequest, "upsert_failed", err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, config)
}

func (h *DashboardHandler) DeleteOAuthProvider(w http.ResponseWriter, r *http.Request) {
	ownerID := middleware.GetUserID(r.Context())
	envID := chi.URLParam(r, "envId")
	provider := chi.URLParam(r, "provider")

	if err := h.environmentService.DeleteOAuthProvider(r.Context(), envID, provider, ownerID); err != nil {
		if err.Error() == "forbidden" {
			writeError(w, http.StatusForbidden, "forbidden", "You don't own this project")
			return
		}
		log.Error().Err(err).Msg("Failed to delete OAuth provider")
		writeError(w, http.StatusInternalServerError, "internal_error", "Failed to delete OAuth provider")
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"message": "Provider deleted"})
}
