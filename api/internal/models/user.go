package models

import "time"

type User struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type EndUser struct {
	User
	ProjectID  string `json:"project_id"`
	IdentityID string `json:"identity"`
}
