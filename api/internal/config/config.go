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
	ResendAPIKey  string `validate:"required"`
	EmailFrom     string
	JWTPrivateKey string
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
