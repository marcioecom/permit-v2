package models

import "time"

// Dashboard DTOs - shared between service and repository layers

// Auth log models

type AuthLog struct {
	ID        string            `json:"id"`
	ProjectID string            `json:"projectId"`
	UserID    string            `json:"userId,omitempty"`
	UserEmail string            `json:"userEmail"`
	EventType string            `json:"eventType"`
	Status    string            `json:"status"`
	IPAddress string            `json:"ipAddress,omitempty"`
	UserAgent string            `json:"userAgent,omitempty"`
	Metadata  map[string]string `json:"metadata,omitempty"`
	CreatedAt time.Time         `json:"timestamp"`
}

type ListAuthLogsInput struct {
	OwnerID   string
	ProjectID string
	EventType string
	DateRange string // "24h", "7d", "30d"
	Page      int
	Limit     int
}

type AuthLogResponse struct {
	ID          string `json:"id"`
	EventType   string `json:"eventType"`
	UserEmail   string `json:"userEmail"`
	ProjectID   string `json:"projectId"`
	ProjectName string `json:"projectName"`
	Status      string `json:"status"`
	IPAddress   string `json:"ipAddress"`
	Timestamp   string `json:"timestamp"`
}

type ListAuthLogsOutput struct {
	Data []AuthLogResponse `json:"data"`
	Meta PaginationMeta    `json:"meta"`
}

type DashboardStats struct {
	ActiveProjects  int    `json:"activeProjects"`
	ProjectsChange  string `json:"projectsChange"`
	MonthlyUsers    int    `json:"monthlyUsers"`
	UsersChange     string `json:"usersChange"`
	APIRequests     string `json:"apiRequests"`
	AuthSuccessRate string `json:"authSuccessRate"`
}

type UserStats struct {
	TotalUsers       int    `json:"totalUsers"`
	ActiveIn24h      int    `json:"activeIn24h"`
	VerificationRate string `json:"verificationRate"`
	BlockedUsers     int    `json:"blockedUsers"`
}

type ProjectWithStats struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	UserCount   int     `json:"userCount"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   string  `json:"updatedAt"`
}

type ListProjectUsersInput struct {
	ProjectID string
	OwnerID   string
	Page      int
	Limit     int
	Search    string
}

type ProjectUserInfo struct {
	ID          string  `json:"id"`
	Email       string  `json:"email"`
	Name        *string `json:"name"`
	ProjectName *string `json:"projectName"`
	AuthMethod  *string `json:"authMethod"`
	LoginCount  int     `json:"loginCount"`
	CreatedAt   string  `json:"createdAt"`
	LastLoginAt *string `json:"lastLoginAt"`
}

type ListProjectUsersOutput struct {
	Data []ProjectUserInfo `json:"data"`
	Meta PaginationMeta    `json:"meta"`
}

type PaginationMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	Total      int `json:"total"`
	TotalPages int `json:"totalPages"`
}

type APIKeyInfo struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	ClientID           string  `json:"clientId"`
	ClientSecretMasked string  `json:"clientSecretMasked"`
	Status             string  `json:"status"`
	LastUsedAt         *string `json:"lastUsedAt"`
	CreatedAt          string  `json:"createdAt"`
}

type RevokedKeyInfo struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	RevokedAt string `json:"revokedAt"`
}
