package handler

import (
	"net/http"

	"github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/service"
)

type SessionHandler struct {
	service *service.SessionService
}

func NewSessionHandler(sessionService *service.SessionService) *SessionHandler {
	return &SessionHandler{service: sessionService}
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

func (h *SessionHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req RefreshRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	output, err := h.service.RefreshToken(r.Context(), service.RefreshTokenInput{
		RefreshToken: req.RefreshToken,
	})
	if err != nil {
		writeError(w, http.StatusUnauthorized, "refresh_failed", "Invalid or expired refresh token")
		return
	}

	writeSuccess(w, http.StatusOK, output)
}

func (h *SessionHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "unauthorized", "Authentication required")
		return
	}

	output, err := h.service.GetMe(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusNotFound, "user_not_found", "User not found")
		return
	}

	writeSuccess(w, http.StatusOK, output)
}

func (h *SessionHandler) Logout(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}
