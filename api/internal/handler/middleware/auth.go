package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/marcioecom/permit/internal/crypto"
)

type contextKey string

const (
	UserIDKey    contextKey = "userId"
	ProjectIDKey contextKey = "projectId"
	EmailKey     contextKey = "email"
)

type AuthMiddleware struct {
	jwtService *crypto.JWTService
}

func NewAuthMiddleware(jwtService *crypto.JWTService) *AuthMiddleware {
	return &AuthMiddleware{jwtService: jwtService}
}

func (m *AuthMiddleware) RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			writeUnauthorized(w, "missing_token", "Authorization header required")
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			writeUnauthorized(w, "invalid_token", "Invalid authorization header format")
			return
		}

		tokenString := parts[1]
		claims, err := m.jwtService.VerifyAccessToken(tokenString)
		if err != nil {
			writeUnauthorized(w, "invalid_token", "Invalid or expired token")
			return
		}

		ctx := r.Context()
		ctx = context.WithValue(ctx, UserIDKey, claims.UserID)
		ctx = context.WithValue(ctx, ProjectIDKey, claims.ProjectID)
		ctx = context.WithValue(ctx, EmailKey, claims.Email)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserID(ctx context.Context) string {
	if v := ctx.Value(UserIDKey); v != nil {
		return v.(string)
	}
	return ""
}

func GetProjectID(ctx context.Context) string {
	if v := ctx.Value(ProjectIDKey); v != nil {
		return v.(string)
	}
	return ""
}

func GetEmail(ctx context.Context) string {
	if v := ctx.Value(EmailKey); v != nil {
		return v.(string)
	}
	return ""
}

func writeUnauthorized(w http.ResponseWriter, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	w.Write([]byte(`{"data":null,"error":{"code":"` + code + `","message":"` + message + `"}}`))
}
