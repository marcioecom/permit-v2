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
	projectService *service.ProjectService
}

func NewDashboardHandler(projectService *service.ProjectService) *DashboardHandler {
	return &DashboardHandler{projectService: projectService}
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
