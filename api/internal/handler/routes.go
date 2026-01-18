package handler

import (
	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/handler/middleware"
)

type Handlers struct {
	Health  *HealthHandler
	Auth    *AuthHandler
	Project *ProjectHandler
}

func SetupRoutes(r *chi.Mux, h *Handlers, jwtService *crypto.JWTService) {
	r.Get("/health", h.Health.GetHealth)

	otpRateLimiter := middleware.RateLimitMiddleware(middleware.OTPLimiter, middleware.IPKeyExtractor)
	authMiddleware := middleware.NewAuthMiddleware(jwtService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.With(authMiddleware.RequireAuth).Get("/me", h.Auth.GetMe)
			r.With(otpRateLimiter).Post("/otp/start", h.Auth.OtpStart)
			r.Post("/otp/verify", h.Auth.OtpVerify)
		})

		r.Route("/projects", func(r chi.Router) {
			r.With(authMiddleware.RequireAuth).Post("/", h.Project.Create)
			r.Get("/{id}", h.Project.GetByID)
			r.Get("/{id}/widget", h.Project.GetWidget)

			r.Group(func(r chi.Router) {
				r.Use(authMiddleware.RequireAuth)
				r.Patch("/{id}", h.Project.Update)
				r.Patch("/{id}/widget", h.Project.UpdateWidget)
				r.Post("/{id}/api-keys", h.Project.CreateAPIKey)
			})
		})
	})
}
