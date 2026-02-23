package handler

import (
	"github.com/go-chi/chi/v5"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/repository"
)

type Handlers struct {
	Health    *HealthHandler
	Auth      *AuthHandler
	Session   *SessionHandler
	Project   *ProjectHandler
	JWKS      *JWKSHandler
	Dashboard *DashboardHandler
	OAuth     *OAuthHandler
}

type Services struct {
	JWTService  *crypto.JWTService
	ProjectRepo repository.ProjectRepository
}

func SetupRoutes(r *chi.Mux, h *Handlers, services *Services) {
	r.Get("/health", h.Health.GetHealth)
	r.Get("/.well-known/jwks.json", h.JWKS.GetJWKS)

	// OAuth callback from providers (Google/GitHub redirect here)
	r.Get("/oauth/callback", h.OAuth.Callback)

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

			// OAuth endpoints
			r.Post("/oauth/authorize", h.OAuth.Authorize)
			r.Post("/oauth/token", h.OAuth.ExchangeToken)
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

		// Dashboard routes (owner-authenticated)
		r.Route("/dashboard", func(r chi.Router) {
			r.Use(authMiddleware.RequireAuth)

			r.Get("/projects", h.Dashboard.ListProjects)
			r.Get("/projects/{id}", h.Dashboard.GetProject)
			r.Get("/projects/{id}/users", h.Dashboard.ListProjectUsers)
			r.Get("/projects/{id}/api-keys", h.Dashboard.ListAPIKeys)
			r.Delete("/projects/{id}/api-keys/{keyId}", h.Dashboard.RevokeAPIKey)

			r.Get("/users", h.Dashboard.ListAllUsers)
			r.Get("/logs", h.Dashboard.ListAuthLogs)
			r.Get("/stats", h.Dashboard.GetDashboardStats)
			r.Get("/users/stats", h.Dashboard.GetUserStats)

			// Environment management
			r.Route("/projects/{id}/environments", func(r chi.Router) {
				r.Get("/", h.Dashboard.ListEnvironments)
				r.Post("/", h.Dashboard.CreateEnvironment)
				r.Get("/{envId}", h.Dashboard.GetEnvironment)
				r.Patch("/{envId}", h.Dashboard.UpdateEnvironment)

				// OAuth provider configs per environment
				r.Route("/{envId}/oauth-providers", func(r chi.Router) {
					r.Get("/", h.Dashboard.ListOAuthProviders)
					r.Put("/", h.Dashboard.UpsertOAuthProvider)
					r.Delete("/{provider}", h.Dashboard.DeleteOAuthProvider)
				})
			})
		})
	})
}
