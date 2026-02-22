package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/marcioecom/permit/internal/config"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/database"
	"github.com/marcioecom/permit/internal/handler"
	hmiddleware "github.com/marcioecom/permit/internal/handler/middleware"
	"github.com/marcioecom/permit/internal/infra"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/marcioecom/permit/internal/service"
	"github.com/rs/zerolog/log"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	ctx := context.Background()
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to connect to database")
	}
	defer db.Close()

	if err = db.MigrateUp(ctx); err != nil {
		log.Fatal().Err(err).Msg("failed to apply pending migrations")
	}

	r := chi.NewRouter()

	r.Use(hmiddleware.PublicCORS())
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	userRepo := repository.NewPostgresUserRepo(db.Pool)
	otpRepo := repository.NewPostgresOTPCodeRepo(db.Pool)
	projectRepo := repository.NewPostgresProjectRepo(db.Pool)
	identityRepo := repository.NewIdentityRepository(db.Pool)

	keyManager := crypto.NewKeyManager()
	if cfg.JWTPrivateKey != "" {
		if err := keyManager.LoadFromPEM(cfg.JWTPrivateKey); err != nil {
			log.Fatal().Err(err).Msg("failed to load JWT private key")
		}
	} else {
		log.Warn().Msg("JWT_PRIVATE_KEY not set, generating ephemeral keys")
		if err := keyManager.GenerateKeyPair(); err != nil {
			log.Fatal().Err(err).Msg("failed to generate JWT keys")
		}
	}
	jwtService := crypto.NewJWTService(keyManager, "permit")

	emailService := infra.NewEmailService(cfg)

	authService := service.NewAuthService(jwtService, emailService, userRepo, otpRepo, identityRepo, projectRepo)
	sessionService := service.NewSessionService(jwtService, userRepo)
	projectService := service.NewProjectService(projectRepo)

	handlers := &handler.Handlers{
		Health:    handler.NewHealthHandler(db.Pool),
		Auth:      handler.NewAuthHandler(authService),
		Session:   handler.NewSessionHandler(sessionService),
		Project:   handler.NewProjectHandler(projectService),
		JWKS:      handler.NewJWKSHandler(jwtService, projectRepo),
		Dashboard: handler.NewDashboardHandler(projectService),
	}
	services := &handler.Services{
		JWTService:  jwtService,
		ProjectRepo: projectRepo,
	}

	handler.SetupRoutes(r, handlers, services)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		log.Info().Msgf("Server starting on port %s", cfg.Port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal().Msgf("server failed: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal().Msgf("Server forced to shutdown: %v", err)
	}

	log.Info().Msg("Server stopped gracefully")
}
