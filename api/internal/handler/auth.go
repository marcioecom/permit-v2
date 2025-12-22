package handler

import (
	"encoding/json"
	"net/http"

	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{
		service: authService,
	}
}

type OTPCodeStartRequest struct {
	ProjectID string `json:"projectId"`
	Email     string `json:"email"`
}

func (h *AuthHandler) OtpStart(w http.ResponseWriter, r *http.Request) {
	var req OTPCodeStartRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Error: "invalid_request", Message: "Invalid JSON body"})
		return
	}

	code, err := h.service.CreateOTPCode(r.Context(), service.CreateAuthInput{
		Email:     req.Email,
		ProjectID: req.ProjectID,
	})
	if err != nil {
		log.Err(err).Msg("failed to create OTP code")
		writeJSON(w, http.StatusBadRequest, ErrorResponse{Message: "If the email exists, a magic link has been sent"})
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{
		"code": code,
	})
}

func (h *AuthHandler) OtpVerify(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusCreated, map[string]string{})
}
