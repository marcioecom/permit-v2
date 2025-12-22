package handler

import (
	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r *chi.Mux, health *HealthHandler, auth *AuthHandler, project *ProjectHandler) {
	r.Get("/health", health.GetHealth)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Post("/otp/start", auth.OtpStart)
			r.Post("/otp/verify", auth.OtpVerify)
		})

		r.Route("/projects", func(r chi.Router) {
			r.Post("/", project.Create)
			r.Get("/{id}", project.GetByID)
		})
	})
}
