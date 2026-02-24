package handler

import (
	"net/http"
	"strings"

	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

type OAuthHandler struct {
	service *service.OAuthService
}

func NewOAuthHandler(oauthService *service.OAuthService) *OAuthHandler {
	return &OAuthHandler{service: oauthService}
}

type OAuthAuthorizeRequest struct {
	Provider      string `json:"provider" validate:"required,oneof=google github"`
	EnvironmentID string `json:"environmentId" validate:"required"`
	RedirectURL   string `json:"redirectUrl" validate:"required"`
}

func (h *OAuthHandler) Authorize(w http.ResponseWriter, r *http.Request) {
	var req OAuthAuthorizeRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	// Extract client origin from Origin or Referer header
	clientOrigin := r.Header.Get("Origin")
	if clientOrigin == "" {
		referer := r.Header.Get("Referer")
		if referer != "" {
			parts := strings.SplitN(referer, "//", 2)
			if len(parts) == 2 {
				hostEnd := strings.IndexByte(parts[1], '/')
				if hostEnd > 0 {
					clientOrigin = parts[0] + "//" + parts[1][:hostEnd]
				} else {
					clientOrigin = referer
				}
			}
		}
	}
	if clientOrigin == "" {
		writeError(w, http.StatusBadRequest, "missing_origin", "Origin header is required")
		return
	}

	output, err := h.service.Authorize(r.Context(), service.AuthorizeInput{
		Provider:      req.Provider,
		EnvironmentID: req.EnvironmentID,
		RedirectURL:   req.RedirectURL,
		ClientOrigin:  clientOrigin,
	})
	if err != nil {
		log.Warn().Err(err).Str("provider", req.Provider).Msg("OAuth authorize failed")
		writeError(w, http.StatusBadRequest, "oauth_authorize_failed", err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, output)
}

func (h *OAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")

	if code == "" || state == "" {
		writeError(w, http.StatusBadRequest, "missing_params", "code and state are required")
		return
	}

	output, err := h.service.HandleCallback(r.Context(), service.CallbackInput{
		Code:      code,
		State:     state,
		IPAddress: r.RemoteAddr,
		UserAgent: r.UserAgent(),
	})
	if err != nil {
		log.Warn().Err(err).Msg("OAuth callback failed")
		http.Error(w, "Authentication failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	http.Redirect(w, r, output.RedirectURL, http.StatusTemporaryRedirect)
}

type OAuthTokenRequest struct {
	Code          string `json:"code" validate:"required"`
	EnvironmentID string `json:"environmentId" validate:"required"`
}

func (h *OAuthHandler) ExchangeToken(w http.ResponseWriter, r *http.Request) {
	var req OAuthTokenRequest
	if err := decodeAndValidate(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "validation_error", err.Error())
		return
	}

	output, err := h.service.ExchangeToken(r.Context(), service.TokenExchangeInput{
		Code:          req.Code,
		EnvironmentID: req.EnvironmentID,
	})
	if err != nil {
		log.Warn().Err(err).Msg("OAuth token exchange failed")
		writeError(w, http.StatusBadRequest, "token_exchange_failed", err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, output)
}
