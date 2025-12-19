package main

import (
	"context"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/marcioecom/permit/internal/config"
	"github.com/marcioecom/permit/internal/database"
	"github.com/marcioecom/permit/internal/handler"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	ctx := context.Background()
	db, err := database.New(ctx, cfg.DatabaseURL)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))

	handler.SetupRoutes(r)

	println("Server is running on port 3000")
	_ = http.ListenAndServe(":3000", r)
}
