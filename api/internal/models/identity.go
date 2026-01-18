package models

import (
	"encoding/json"
	"time"
)

// Identity represents a linked authentication method for a user
type Identity struct {
	ID             string          `json:"id"`
	UserID         string          `json:"userId"`
	Provider       string          `json:"provider"` // "email", "google", "github"
	ProviderUserID string          `json:"providerUserId,omitempty"`
	Email          string          `json:"email,omitempty"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	CreatedAt      time.Time       `json:"createdAt"`
}

// IdentityProvider constants
const (
	ProviderEmail  = "email"
	ProviderGoogle = "google"
	ProviderGitHub = "github"
)

// IsValidProvider checks if a provider string is valid
func IsValidProvider(provider string) bool {
	switch provider {
	case ProviderEmail, ProviderGoogle, ProviderGitHub:
		return true
	default:
		return false
	}
}
