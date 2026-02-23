package models

import (
	"encoding/json"
	"time"
)

type OAuthProviderConfig struct {
	ID                    string    `json:"id"`
	EnvironmentID         string    `json:"environmentId"`
	Provider              string    `json:"provider"`
	Enabled               bool      `json:"enabled"`
	ClientID              *string   `json:"clientId,omitempty"`
	ClientSecretEncrypted *string   `json:"-"`
	Scopes                []string  `json:"scopes"`
	CreatedAt             time.Time `json:"createdAt"`
	UpdatedAt             time.Time `json:"updatedAt"`
}

type OAuthState struct {
	ID            string    `json:"id"`
	EnvironmentID string    `json:"environmentId"`
	Provider      string    `json:"provider"`
	State         string    `json:"state"`
	RedirectURL   string    `json:"redirectUrl"`
	ClientOrigin  string    `json:"clientOrigin"`
	ExpiresAt     time.Time `json:"expiresAt"`
	CreatedAt     time.Time `json:"createdAt"`
}

type OAuthAuthorizationCode struct {
	ID            string     `json:"id"`
	EnvironmentID string     `json:"environmentId"`
	UserID        string     `json:"userId"`
	Code          string     `json:"code"`
	Provider      string     `json:"provider"`
	ExpiresAt     time.Time  `json:"expiresAt"`
	UsedAt        *time.Time `json:"usedAt,omitempty"`
	CreatedAt     time.Time  `json:"createdAt"`
}

// OAuthUserProfile represents user info fetched from a provider.
type OAuthUserProfile struct {
	Email          string
	Name           string
	AvatarURL      string
	ProviderUserID string
	RawMetadata    json.RawMessage
}

// Default scopes per provider.
var DefaultOAuthScopes = map[string][]string{
	ProviderGoogle: {"openid", "email", "profile"},
	ProviderGitHub: {"user:email", "read:user"},
}

// OAuthProviderEndpoints holds URLs for a provider's OAuth flow.
type OAuthProviderEndpoints struct {
	AuthURL     string
	TokenURL    string
	UserInfoURL string
	EmailURL    string // optional, for GitHub private emails
}

var OAuthEndpoints = map[string]OAuthProviderEndpoints{
	ProviderGoogle: {
		AuthURL:     "https://accounts.google.com/o/oauth2/v2/auth",
		TokenURL:    "https://oauth2.googleapis.com/token",
		UserInfoURL: "https://www.googleapis.com/oauth2/v2/userinfo",
	},
	ProviderGitHub: {
		AuthURL:     "https://github.com/login/oauth/authorize",
		TokenURL:    "https://github.com/login/oauth/access_token",
		UserInfoURL: "https://api.github.com/user",
		EmailURL:    "https://api.github.com/user/emails",
	},
}
