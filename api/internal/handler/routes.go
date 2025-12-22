package handler

import (
	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r *chi.Mux, health *HealthHandler, auth *AuthHandler, project *ProjectHandler) {
	r.Get("/health", health.GetHealth)

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Hello World!"))
		})
	})
}
