package middleware

import (
	"net/http"
	"slices"
	"strings"

	"github.com/marcioecom/permit/internal/repository"
)

var defaultAllowedOrigins = []string{
	"http://localhost:3000",
	"http://localhost:5173",
	"http://localhost:8080",
}

type CORSMiddleware struct {
	projectRepo repository.ProjectRepository
}

func NewCORSMiddleware(projectRepo repository.ProjectRepository) *CORSMiddleware {
	return &CORSMiddleware{projectRepo: projectRepo}
}

func (m *CORSMiddleware) Handler() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				next.ServeHTTP(w, r)
				return
			}

			allowed := m.isOriginAllowed(r, origin)
			if allowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			if r.Method == "OPTIONS" {
				if allowed {
					w.WriteHeader(http.StatusOK)
				} else {
					w.WriteHeader(http.StatusForbidden)
				}
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func (m *CORSMiddleware) isOriginAllowed(r *http.Request, origin string) bool {
	if slices.Contains(defaultAllowedOrigins, origin) {
		return true
	}

	projectID := extractProjectID(r)
	if projectID == "" {
		return slices.Contains(defaultAllowedOrigins, origin)
	}

	project, err := m.projectRepo.GetByID(r.Context(), projectID)
	if err != nil || project == nil {
		return slices.Contains(defaultAllowedOrigins, origin)
	}

	if len(project.AllowedOrigins) == 0 {
		return true
	}

	for _, allowed := range project.AllowedOrigins {
		if allowed == "*" || allowed == origin {
			return true
		}
		if strings.HasPrefix(allowed, "*.") {
			suffix := strings.TrimPrefix(allowed, "*")
			if strings.HasSuffix(origin, suffix) {
				return true
			}
		}
	}

	return false
}

func extractProjectID(r *http.Request) string {
	if pid := r.URL.Query().Get("projectId"); pid != "" {
		return pid
	}

	if strings.Contains(r.URL.Path, "/projects/") {
		parts := strings.Split(r.URL.Path, "/projects/")
		if len(parts) > 1 {
			idPart := strings.Split(parts[1], "/")[0]
			return idPart
		}
	}

	return ""
}

func PublicCORS() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				origin = "*"
			}

			if slices.Contains(defaultAllowedOrigins, origin) || origin == "*" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
