package handler

import (
	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/repository"
)

type Handlers struct {
	Health  *HealthHandler
	Auth    *AuthHandler
	Session *SessionHandler
	Project *ProjectHandler
}

type Services struct {
	JWTService  *crypto.JWTService
	ProjectRepo repository.ProjectRepository
}

func SetupRoutes(r *chi.Mux, h *Handlers, services *Services) {
	r.Get("/health", h.Health.GetHealth)

	corsMiddleware := middleware.NewCORSMiddleware(services.ProjectRepo)
	otpRateLimiter := middleware.RateLimitMiddleware(middleware.OTPLimiter, middleware.IPKeyExtractor)
	authMiddleware := middleware.NewAuthMiddleware(services.JWTService)

	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Use(corsMiddleware.Handler())

			r.With(authMiddleware.RequireAuth).Get("/me", h.Session.GetMe)

			r.With(otpRateLimiter).Post("/otp/start", h.Auth.OtpStart)
			r.Post("/otp/verify", h.Auth.OtpVerify)

			r.Post("/refresh", h.Session.Refresh)
			r.With(authMiddleware.RequireAuth).Post("/logout", h.Session.Logout)
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
