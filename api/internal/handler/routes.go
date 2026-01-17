package handler

import (
	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/handler/middleware"
)

func SetupRoutes(r *chi.Mux, health *HealthHandler, auth *AuthHandler, project *ProjectHandler) {
	r.Get("/health", health.GetHealth)

	otpRateLimiter := middleware.RateLimitMiddleware(middleware.OTPLimiter, middleware.IPKeyExtractor)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Get("/me", auth.GetMe)
			r.With(otpRateLimiter).Post("/otp/start", auth.OtpStart)
			r.Post("/otp/verify", auth.OtpVerify)
		})

		r.Route("/projects", func(r chi.Router) {
			r.Post("/", project.Create)
			r.Get("/{id}", project.GetByID)
			r.Patch("/{id}", project.Update)
			r.Get("/{id}/widget", project.GetWidget)
			r.Patch("/{id}/widget", project.UpdateWidget)
			r.Post("/{id}/api-keys", project.CreateAPIKey)
		})
	})
}
