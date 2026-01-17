package handler

import (
	"net/http"
	"strings"

	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{service: authService}
}

type OTPCodeStartRequest struct {
	ProjectID string `json:"projectId" validate:"required"`
	Email     string `json:"email" validate:"required,email"`
}

type OTPCodeVerifyRequest struct {
	ProjectID string `json:"projectId" validate:"required"`
	Code      string `json:"code" validate:"required,len=6,numeric"`
}

func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	writeSuccess(w, http.StatusOK, nil)
}

func (h *AuthHandler) OtpStart(w http.ResponseWriter, r *http.Request) {
	var req OTPCodeStartRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	req.Email = strings.ToLower(strings.TrimSpace(req.Email))

	err := h.service.CreateOTPCode(r.Context(), service.CreateAuthInput{
		Email:     req.Email,
		ProjectID: req.ProjectID,
	})
	if err != nil {
		log.Warn().Err(err).Str("email", req.Email).Msg("OTP creation failed")
	}

	writeSuccess(w, http.StatusOK, map[string]string{
		"message": "If the email is valid, a verification code has been sent",
	})
}

func (h *AuthHandler) OtpVerify(w http.ResponseWriter, r *http.Request) {
	var req OTPCodeVerifyRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	output, err := h.service.VerifyOTPCode(r.Context(), service.VerifyAuthInput{
		Code:      req.Code,
		ProjectID: req.ProjectID,
	})
	if err != nil {
		log.Warn().Err(err).Str("projectId", req.ProjectID).Msg("OTP verification failed")
		writeError(w, http.StatusBadRequest, "verification_failed", "Invalid or expired code")
		return
	}

	writeSuccess(w, http.StatusOK, output)
}
