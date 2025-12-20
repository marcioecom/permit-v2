package models

import (
	"time"
)

type User struct {
	ID          string    `json:"id"`
	Email       string    `json:"email"`
	DisplayName string    `json:"Email"` // from project_users table
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// TODO: implement identity in future, so we can know which method user used to login
// type Identity struct {
// 	UserID    string          `json:"user_id"`
// 	Provider  string          `json:"provider"`
// 	Metadata  json.RawMessage `json:"metadata,omitempty"`
// 	CreatedAt time.Time       `json:"created_at"`
// }
