package models

import "time"

const (
	EnvTypeDevelopment = "development"
	EnvTypeStaging     = "staging"
	EnvTypeProduction  = "production"
)

type Environment struct {
	ID             string    `json:"id"`
	ProjectID      string    `json:"projectId"`
	Name           string    `json:"name"`
	Type           string    `json:"type"`
	AllowedOrigins []string  `json:"allowedOrigins"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}
