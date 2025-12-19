package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	config := &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}

	if err := config.validate(); err != nil {
		return nil, err
	}

	return config, nil
}

func (c *Config) validate() error {
	missing := []string{}

	if c.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}

	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}

	return nil
}
