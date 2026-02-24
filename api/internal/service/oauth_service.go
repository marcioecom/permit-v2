package service

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/marcioecom/permit/internal/config"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
	"github.com/rs/zerolog/log"
)

type OAuthService struct {
	cfg          *config.Config
	jwtService   *crypto.JWTService
	oauthRepo    repository.OAuthRepository
	envRepo      repository.EnvironmentRepository
	userRepo     repository.UserRepository
	identityRepo repository.IdentityRepository
	projectRepo  repository.ProjectRepository
	httpClient   *http.Client
}

func NewOAuthService(
	cfg *config.Config,
	jwtService *crypto.JWTService,
	oauthRepo repository.OAuthRepository,
	envRepo repository.EnvironmentRepository,
	userRepo repository.UserRepository,
	identityRepo repository.IdentityRepository,
	projectRepo repository.ProjectRepository,
) *OAuthService {
	return &OAuthService{
		cfg:          cfg,
		jwtService:   jwtService,
		oauthRepo:    oauthRepo,
		envRepo:      envRepo,
		userRepo:     userRepo,
		identityRepo: identityRepo,
		projectRepo:  projectRepo,
		httpClient:   &http.Client{Timeout: 10 * time.Second},
	}
}

type AuthorizeInput struct {
	Provider      string
	EnvironmentID string
	RedirectURL   string // client's callback path, e.g. "/sso-callback"
	ClientOrigin  string // from Origin or Referer header
}

type AuthorizeOutput struct {
	AuthorizationURL string `json:"authorizationUrl"`
}

func (s *OAuthService) Authorize(ctx context.Context, input AuthorizeInput) (*AuthorizeOutput, error) {
	env, err := s.envRepo.GetByID(ctx, input.EnvironmentID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("environment_not_found")
		}
		return nil, err
	}

	clientID, _, err := s.resolveCredentials(ctx, env, input.Provider)
	if err != nil {
		return nil, err
	}

	endpoints, ok := models.OAuthEndpoints[input.Provider]
	if !ok {
		return nil, fmt.Errorf("unsupported_provider")
	}

	// Generate cryptographic state
	stateBytes := make([]byte, 32)
	if _, err := rand.Read(stateBytes); err != nil {
		return nil, fmt.Errorf("state_generation_failed")
	}
	stateValue := base64.URLEncoding.EncodeToString(stateBytes)

	// Save state for CSRF validation
	oauthState := &models.OAuthState{
		ID:            ulid.Make().String(),
		EnvironmentID: input.EnvironmentID,
		Provider:      input.Provider,
		State:         stateValue,
		RedirectURL:   input.RedirectURL,
		ClientOrigin:  input.ClientOrigin,
		ExpiresAt:     time.Now().Add(10 * time.Minute),
	}
	if err := s.oauthRepo.CreateState(ctx, oauthState); err != nil {
		return nil, fmt.Errorf("state_save_failed: %w", err)
	}

	// Build authorization URL
	scopes := models.DefaultOAuthScopes[input.Provider]
	callbackURL := s.cfg.OAuthCallbackBaseURL + "/oauth/callback"

	params := url.Values{
		"client_id":     {clientID},
		"redirect_uri":  {callbackURL},
		"response_type": {"code"},
		"scope":         {strings.Join(scopes, " ")},
		"state":         {stateValue},
	}

	if input.Provider == models.ProviderGoogle {
		params.Set("access_type", "offline")
		params.Set("prompt", "consent")
	}

	authURL := endpoints.AuthURL + "?" + params.Encode()

	return &AuthorizeOutput{AuthorizationURL: authURL}, nil
}

type CallbackInput struct {
	Code      string // provider's authorization code
	State     string // CSRF state
	IPAddress string
	UserAgent string
}

type CallbackOutput struct {
	RedirectURL string // full URL to redirect user to, including Permit auth code
}

func (s *OAuthService) HandleCallback(ctx context.Context, input CallbackInput) (*CallbackOutput, error) {
	// 1. Validate state
	oauthState, err := s.oauthRepo.GetAndDeleteState(ctx, input.State)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("invalid_state")
		}
		return nil, err
	}

	env, err := s.envRepo.GetByID(ctx, oauthState.EnvironmentID)
	if err != nil {
		return nil, fmt.Errorf("environment_not_found")
	}

	clientID, clientSecret, err := s.resolveCredentials(ctx, env, oauthState.Provider)
	if err != nil {
		return nil, err
	}

	// 2. Exchange code for access token
	callbackURL := s.cfg.OAuthCallbackBaseURL + "/oauth/callback"
	providerToken, err := s.exchangeCodeForToken(oauthState.Provider, input.Code, clientID, clientSecret, callbackURL)
	if err != nil {
		log.Warn().Err(err).Str("provider", oauthState.Provider).Msg("token exchange failed")
		return nil, fmt.Errorf("token_exchange_failed")
	}

	// 3. Fetch user profile
	profile, err := s.fetchUserProfile(oauthState.Provider, providerToken)
	if err != nil {
		log.Warn().Err(err).Str("provider", oauthState.Provider).Msg("profile fetch failed")
		return nil, fmt.Errorf("profile_fetch_failed")
	}

	// 4. Create or find user
	user, err := s.userRepo.GetByEmail(ctx, profile.Email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	var userID string
	if user == nil {
		userID, err = s.userRepo.Create(ctx, &models.User{
			ID:    ulid.Make().String(),
			Email: profile.Email,
		})
		if err != nil {
			return nil, err
		}
	} else {
		userID = user.ID
	}

	// 5. Create/update identity
	existingIdentity, _ := s.identityRepo.GetByUserAndProvider(ctx, userID, oauthState.Provider)
	if existingIdentity == nil {
		if err := s.identityRepo.Create(ctx, &models.Identity{
			ID:             ulid.Make().String(),
			UserID:         userID,
			Provider:       oauthState.Provider,
			ProviderUserID: profile.ProviderUserID,
			Email:          profile.Email,
			Metadata:       profile.RawMetadata,
		}); err != nil {
			log.Warn().Err(err).Str("userId", userID).Str("provider", oauthState.Provider).Msg("failed to create identity")
		}
	}

	// 6. Upsert project_users
	if err := s.projectRepo.UpsertProjectUser(ctx, env.ProjectID, oauthState.EnvironmentID, userID, oauthState.Provider); err != nil {
		log.Warn().Err(err).Msg("failed to upsert project user")
	}

	// 7. Log auth event
	s.logAuthEvent(ctx, env.ProjectID, userID, profile.Email, "login", "SUCCESS", input.IPAddress, input.UserAgent, map[string]string{"provider": oauthState.Provider})

	// 8. Generate Permit authorization code
	codeBytes := make([]byte, 32)
	if _, err := rand.Read(codeBytes); err != nil {
		return nil, fmt.Errorf("code_generation_failed")
	}
	permitCode := base64.URLEncoding.EncodeToString(codeBytes)

	authCode := &models.OAuthAuthorizationCode{
		ID:            ulid.Make().String(),
		EnvironmentID: oauthState.EnvironmentID,
		UserID:        userID,
		Code:          permitCode,
		Provider:      oauthState.Provider,
		ExpiresAt:     time.Now().Add(60 * time.Second),
	}
	if err := s.oauthRepo.CreateAuthorizationCode(ctx, authCode); err != nil {
		return nil, fmt.Errorf("auth_code_save_failed: %w", err)
	}

	// 9. Build redirect URL back to client
	redirectURL := oauthState.ClientOrigin + oauthState.RedirectURL + "?code=" + url.QueryEscape(permitCode)

	return &CallbackOutput{RedirectURL: redirectURL}, nil
}

type TokenExchangeInput struct {
	Code          string
	EnvironmentID string
}

func (s *OAuthService) ExchangeToken(ctx context.Context, input TokenExchangeInput) (*VerifyAuthOutput, error) {
	authCode, err := s.oauthRepo.GetAndUseAuthorizationCode(ctx, input.Code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("invalid_code")
		}
		return nil, err
	}

	if authCode.EnvironmentID != input.EnvironmentID {
		return nil, fmt.Errorf("environment_mismatch")
	}

	env, err := s.envRepo.GetByID(ctx, authCode.EnvironmentID)
	if err != nil {
		return nil, fmt.Errorf("environment_not_found")
	}

	user, err := s.userRepo.GetByID(ctx, authCode.UserID)
	if err != nil {
		return nil, err
	}

	accessToken, err := s.jwtService.SignAccessToken(user.Email, user.ID, env.ProjectID, authCode.EnvironmentID, authCode.Provider)
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
	}

	refreshToken, err := s.jwtService.SignRefreshToken(user.ID, env.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
	}

	return &VerifyAuthOutput{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &UserInfo{
			ID:    user.ID,
			Email: user.Email,
		},
	}, nil
}

// resolveCredentials returns clientID and clientSecret for the given environment and provider.
func (s *OAuthService) resolveCredentials(ctx context.Context, env *models.Environment, provider string) (string, string, error) {
	providerConfig, err := s.oauthRepo.GetProviderConfig(ctx, env.ID, provider)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", "", err
	}

	// Check if provider is enabled
	if providerConfig != nil && !providerConfig.Enabled {
		return "", "", fmt.Errorf("provider_not_enabled")
	}

	// Use custom credentials if configured
	if providerConfig != nil && providerConfig.ClientID != nil && *providerConfig.ClientID != "" {
		if providerConfig.ClientSecretEncrypted == nil || *providerConfig.ClientSecretEncrypted == "" {
			return "", "", fmt.Errorf("provider_secret_missing")
		}
		return *providerConfig.ClientID, *providerConfig.ClientSecretEncrypted, nil
	}

	// Use shared credentials for dev environments
	if env.Type == models.EnvTypeDevelopment {
		switch provider {
		case models.ProviderGoogle:
			if s.cfg.SharedGoogleClientID != "" {
				return s.cfg.SharedGoogleClientID, s.cfg.SharedGoogleClientSecret, nil
			}
		case models.ProviderGitHub:
			if s.cfg.SharedGitHubClientID != "" {
				return s.cfg.SharedGitHubClientID, s.cfg.SharedGitHubClientSecret, nil
			}
		}
	}

	return "", "", fmt.Errorf("provider_not_configured")
}

func (s *OAuthService) exchangeCodeForToken(provider, code, clientID, clientSecret, redirectURI string) (string, error) {
	endpoints := models.OAuthEndpoints[provider]

	data := url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"redirect_uri":  {redirectURI},
	}

	if provider == models.ProviderGoogle {
		data.Set("grant_type", "authorization_code")
	}

	req, err := http.NewRequest("POST", endpoints.TokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		Error       string `json:"error"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("failed to parse token response")
	}
	if tokenResp.Error != "" {
		return "", fmt.Errorf("provider error: %s", tokenResp.Error)
	}
	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("no access token in response")
	}

	return tokenResp.AccessToken, nil
}

func (s *OAuthService) fetchUserProfile(provider, accessToken string) (*models.OAuthUserProfile, error) {
	endpoints := models.OAuthEndpoints[provider]

	req, err := http.NewRequest("GET", endpoints.UserInfoURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	switch provider {
	case models.ProviderGoogle:
		return parseGoogleProfile(body)
	case models.ProviderGitHub:
		return s.parseGitHubProfile(body, accessToken)
	default:
		return nil, fmt.Errorf("unsupported provider")
	}
}

func parseGoogleProfile(body []byte) (*models.OAuthUserProfile, error) {
	var data struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}
	if data.Email == "" {
		return nil, fmt.Errorf("no email in Google profile")
	}
	return &models.OAuthUserProfile{
		Email:          data.Email,
		Name:           data.Name,
		AvatarURL:      data.Picture,
		ProviderUserID: data.ID,
		RawMetadata:    body,
	}, nil
}

func (s *OAuthService) parseGitHubProfile(body []byte, accessToken string) (*models.OAuthUserProfile, error) {
	var data struct {
		ID        int    `json:"id"`
		Login     string `json:"login"`
		Email     string `json:"email"`
		Name      string `json:"name"`
		AvatarURL string `json:"avatar_url"`
	}
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, err
	}

	email := data.Email
	// GitHub may not return email in profile; fetch from /user/emails
	if email == "" {
		var err error
		email, err = s.fetchGitHubPrimaryEmail(accessToken)
		if err != nil {
			return nil, fmt.Errorf("no email available from GitHub")
		}
	}

	return &models.OAuthUserProfile{
		Email:          email,
		Name:           data.Name,
		AvatarURL:      data.AvatarURL,
		ProviderUserID: fmt.Sprintf("%d", data.ID),
		RawMetadata:    body,
	}, nil
}

func (s *OAuthService) fetchGitHubPrimaryEmail(accessToken string) (string, error) {
	req, err := http.NewRequest("GET", models.OAuthEndpoints[models.ProviderGitHub].EmailURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	var emails []struct {
		Email    string `json:"email"`
		Primary  bool   `json:"primary"`
		Verified bool   `json:"verified"`
	}
	if err := json.Unmarshal(body, &emails); err != nil {
		return "", err
	}

	for _, e := range emails {
		if e.Primary && e.Verified {
			return e.Email, nil
		}
	}
	for _, e := range emails {
		if e.Verified {
			return e.Email, nil
		}
	}

	return "", fmt.Errorf("no verified email found")
}

func (s *OAuthService) logAuthEvent(ctx context.Context, projectID, userID, email, eventType, status, ip, ua string, metadata map[string]string) {
	err := s.projectRepo.InsertAuthLog(ctx, &models.AuthLog{
		ID:        ulid.Make().String(),
		ProjectID: projectID,
		UserID:    userID,
		UserEmail: email,
		EventType: eventType,
		Status:    status,
		IPAddress: ip,
		UserAgent: ua,
		Metadata:  metadata,
		CreatedAt: time.Now(),
	})
	if err != nil {
		log.Warn().Err(err).Msg("failed to log auth event")
	}
}
