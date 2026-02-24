package models

import (
	"encoding/json"
	"time"
)

type Project struct {
	ID               string          `json:"id"`
	OwnerID          string          `json:"ownerId"`
	Name             string          `json:"name"`
	Description      *string         `json:"description"`
	AllowedOrigins   []string        `json:"allowedOrigins"`
	AllowedProviders []string        `json:"allowedProviders"`
	ThemeConfig      json.RawMessage `json:"themeConfig"`
	CreatedAt        time.Time       `json:"createdAt"`
	UpdatedAt        time.Time       `json:"updatedAt"`
}

type APIKey struct {
	ID               string     `json:"id"`
	ProjectID        string     `json:"projectId"`
	EnvironmentID    string     `json:"environmentId"`
	Name             string     `json:"name"`
	ClientID         string     `json:"clientId"`
	ClientSecretHash string     `json:"-"`
	LastUsedAt       *time.Time `json:"lastUsedAt,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type Widget struct {
	ProjectID        string      `json:"projectId"`
	Title            string      `json:"title"`
	Subtitle         string      `json:"subtitle"`
	ThemeConfig      ThemeConfig `json:"themeConfig"`
	EnabledProviders []string    `json:"enabledProviders"`
	UpdatedAt        time.Time   `json:"updatedAt"`
}

type ThemeConfig struct {
	PrimaryColor     string `json:"primaryColor,omitempty"`
	LogoURL          string `json:"logoUrl,omitempty"`
	LogoType         string `json:"logoType,omitempty"`     // "url", "upload", or "icon"
	LogoIconName     string `json:"logoIconName,omitempty"` // lucide icon name when LogoType is "icon"
	BorderRadius     string `json:"borderRadius,omitempty"`
	DarkMode         bool   `json:"darkMode,omitempty"`
	ShowSecuredBadge *bool  `json:"showSecuredBadge,omitempty"` // pointer to distinguish false from unset
	EntryTitle       string `json:"entryTitle,omitempty"`
	TermsURL         string `json:"termsUrl,omitempty"`
	PrivacyURL       string `json:"privacyUrl,omitempty"`
}
