package models

import (
	"encoding/json"
	"time"
)

type Project struct {
	ID               string          `json:"id"`
	Name             string          `json:"name"`
	Description      string          `json:"description"`
	ClientID         string          `json:"client_id"`
	AllowedOrigins   []string        `json:"allowed_origins"`
	AllowedProviders []string        `json:"allowed_providers"`
	ThemeConfig      json.RawMessage `json:"theme_config"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

type ThemeConfig struct {
	PrimaryColor     string `json:"primary_color,omitempty"`
	LogoURL          string `json:"logo_url,omitempty"`
	LogoType         string `json:"logo_type,omitempty"`      // "url", "upload", or "icon"
	LogoIconName     string `json:"logo_icon_name,omitempty"` // lucide icon name when LogoType is "icon"
	BorderRadius     string `json:"border_radius,omitempty"`
	DarkMode         bool   `json:"dark_mode,omitempty"`
	ShowSecuredBadge *bool  `json:"show_secured_badge,omitempty"` // pointer to distinguish false from unset
	EntryTitle       string `json:"entry_title,omitempty"`
	TermsURL         string `json:"terms_url,omitempty"`
	PrivacyURL       string `json:"privacy_url,omitempty"`
}
