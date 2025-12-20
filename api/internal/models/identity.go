package models

import (
	"encoding/json"
	"time"
)

type Identity struct {
	UserID    string          `json:"user_id"`
	Provider  string          `json:"provider"`
	Metadata  json.RawMessage `json:"metadata,omitempty"`
	CreatedAt time.Time       `json:"created_at"`
}
