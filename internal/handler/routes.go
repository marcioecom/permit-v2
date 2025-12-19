package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func SetupRoutes(r *chi.Mux) {
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/", func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("Hello World!"))
		})
	})
}
