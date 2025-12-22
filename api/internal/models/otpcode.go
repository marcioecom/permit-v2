package models

import "time"

type OTPCode struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	ProjectID string    `json:"projectId"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expiresAt"`
	UsedAt    time.Time `json:"usedAt"`
	CreatedAt time.Time `json:"created_at"`
}
