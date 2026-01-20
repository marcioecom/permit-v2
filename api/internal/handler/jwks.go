package handler

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/rs/zerolog/log"
	"golang.org/x/crypto/bcrypt"
)

type JWKSHandler struct {
	jwtService  *crypto.JWTService
	projectRepo repository.ProjectRepository
}

func NewJWKSHandler(jwtService *crypto.JWTService, projectRepo repository.ProjectRepository) *JWKSHandler {
	return &JWKSHandler{
		jwtService:  jwtService,
		projectRepo: projectRepo,
	}
}

func (h *JWKSHandler) GetJWKS(w http.ResponseWriter, r *http.Request) {
	clientID, clientSecret, ok := parseBasicAuth(r)
	if !ok {
		w.Header().Set("WWW-Authenticate", `Basic realm="Permit API"`)
		http.Error(w, "Unauthorized: Missing or invalid Authorization header", http.StatusUnauthorized)
		return
	}

	apiKey, err := h.projectRepo.GetAPIKeyByClientID(r.Context(), clientID)
	if err != nil {
		log.Error().Err(err).Str("clientID", clientID).Msg("failed to fetch API key")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if apiKey == nil {
		log.Warn().Str("clientID", clientID).Msg("API key not found")
		http.Error(w, "Unauthorized: Invalid credentials", http.StatusUnauthorized)
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(apiKey.ClientSecretHash), []byte(clientSecret)); err != nil {
		log.Warn().Str("clientID", clientID).Msg("Invalid client secret")
		http.Error(w, "Unauthorized: Invalid credentials", http.StatusUnauthorized)
		return
	}

	jwks := h.jwtService.GetKeyManager().GetJWKS()

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	if err := json.NewEncoder(w).Encode(jwks); err != nil {
		log.Error().Err(err).Msg("failed to encode JWKS response")
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
	}
}

func parseBasicAuth(r *http.Request) (clientID, clientSecret string, ok bool) {
	auth := r.Header.Get("Authorization")
	if auth == "" {
		return "", "", false
	}

	const prefix = "Basic "
	if !strings.HasPrefix(auth, prefix) {
		return "", "", false
	}

	decoded, err := base64.StdEncoding.DecodeString(auth[len(prefix):])
	if err != nil {
		return "", "", false
	}

	credentials := string(decoded)
	colonIndex := strings.Index(credentials, ":")
	if colonIndex < 0 {
		return "", "", false
	}

	return credentials[:colonIndex], credentials[colonIndex+1:], true
}
