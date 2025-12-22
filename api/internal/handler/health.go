package handler

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type HealthHandler struct {
	db        *pgxpool.Pool
	startTime time.Time
}

func NewHealthHandler(db *pgxpool.Pool) *HealthHandler {
	return &HealthHandler{
		db:        db,
		startTime: time.Now(),
	}
}

type HealthResponse struct {
	Status    string `json:"status"`
	Timestamp string `json:"timestamp"`
	Uptime    string `json:"uptime"`
}

func (h *HealthHandler) GetHealth(w http.ResponseWriter, r *http.Request) {
	err := h.db.Ping(r.Context())
	status := "healthy"
	if err != nil {
		status = "db_down"
	}

	writeJSON(w, http.StatusOK, HealthResponse{
		Status:    status,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Uptime:    time.Since(h.startTime).String(),
	})
}
