package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/joho/godotenv"
)

type Config struct {
	Port          string `validate:"required"`
	DatabaseURL   string `validate:"required"`
	AdminEmail    string `validate:"required"`
	ResendAPIKey  string
	EmailFrom     string
	JWTPrivateKey string

	UseMailHog bool
	SMTPHost   string
	SMTPPort   string

	// OAuth shared credentials (used for development environments)
	OAuthCallbackBaseURL     string
	SharedGoogleClientID     string `validate:"required"`
	SharedGoogleClientSecret string `validate:"required"`
	SharedGitHubClientID     string `validate:"required"`
	SharedGitHubClientSecret string `validate:"required"`
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	config := &Config{
		Port:          getEnv("PORT", "8080"),
		DatabaseURL:   getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/permit"),
		AdminEmail:    os.Getenv("ADMIN_EMAIL"),
		ResendAPIKey:  os.Getenv("RESEND_API_KEY"),
		EmailFrom:     getEnv("EMAIL_FROM", "Permit <noreply@permit.marcio.run>"),
		JWTPrivateKey: os.Getenv("JWT_PRIVATE_KEY"),

		UseMailHog: os.Getenv("USE_MAILHOG") == "true",
		SMTPHost:   getEnv("SMTP_HOST", "localhost"),
		SMTPPort:   getEnv("SMTP_PORT", "1025"),

		OAuthCallbackBaseURL:     getEnv("OAUTH_CALLBACK_BASE_URL", "http://localhost:8080"),
		SharedGoogleClientID:     os.Getenv("PERMIT_SHARED_GOOGLE_CLIENT_ID"),
		SharedGoogleClientSecret: os.Getenv("PERMIT_SHARED_GOOGLE_CLIENT_SECRET"),
		SharedGitHubClientID:     os.Getenv("PERMIT_SHARED_GITHUB_CLIENT_ID"),
		SharedGitHubClientSecret: os.Getenv("PERMIT_SHARED_GITHUB_CLIENT_SECRET"),
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

func (c *Config) validate() error {
	errors := make(map[string]string)

	validate := validator.New()
	if err := validate.Struct(c); err != nil {
		for _, validationErr := range err.(validator.ValidationErrors) {
			errors[validationErr.Field()] = fmt.Sprintf(
				"failed '%s' tag check (value '%s' is not valid)",
				validationErr.Tag(), validationErr.Value(),
			)
		}
	}

	if len(errors) > 0 {
		return fmt.Errorf("missing required environment variables: %s", prettyfy(errors))
	}

	return nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func prettyfy(errFields map[string]string) string {
	var msg strings.Builder
	for field, error := range errFields {
		fmt.Fprintf(&msg, "%s %s; ", field, error)
	}
	return msg.String()
}
