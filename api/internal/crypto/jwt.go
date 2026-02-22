package crypto

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/oklog/ulid/v2"
)

const (
	AccessTokenDuration  = 15 * time.Minute
	RefreshTokenDuration = 7 * 24 * time.Hour
)

// AccessTokenClaims represents the claims in an access token
type AccessTokenClaims struct {
	jwt.RegisteredClaims
	Email     string `json:"email"`
	UserID    string `json:"uid"`
	ProjectID string `json:"pid"`
	Provider  string `json:"provider"` // "magic_link" | "google"
}

// RefreshTokenClaims represents the claims in a refresh token
type RefreshTokenClaims struct {
	jwt.RegisteredClaims
	UserID    string `json:"uid"`
	ProjectID string `json:"pid"`
	TokenType string `json:"type"`
}

// JWTService handles JWT token operations
type JWTService struct {
	keyManager *KeyManager
	issuer     string
}

// NewJWTService creates a new JWT service
func NewJWTService(keyManager *KeyManager, issuer string) *JWTService {
	return &JWTService{
		keyManager: keyManager,
		issuer:     issuer,
	}
}

// SignAccessToken creates a signed access token
func (s *JWTService) SignAccessToken(email, userID, projectID, provider string) (string, error) {
	if !s.keyManager.IsLoaded() {
		return "", fmt.Errorf("keys not loaded")
	}

	now := time.Now()
	claims := AccessTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{projectID},
			ExpiresAt: jwt.NewNumericDate(now.Add(AccessTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        ulid.Make().String(),
		},
		Email:     email,
		UserID:    userID,
		ProjectID: projectID,
		Provider:  provider,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = s.keyManager.GetKeyID()

	signedToken, err := token.SignedString(s.keyManager.GetPrivateKey())
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return signedToken, nil
}

// SignRefreshToken creates a signed refresh token
func (s *JWTService) SignRefreshToken(userID, projectID string) (string, error) {
	if !s.keyManager.IsLoaded() {
		return "", fmt.Errorf("keys not loaded")
	}

	now := time.Now()
	claims := RefreshTokenClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    s.issuer,
			Subject:   userID,
			Audience:  jwt.ClaimStrings{projectID},
			ExpiresAt: jwt.NewNumericDate(now.Add(RefreshTokenDuration)),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ID:        ulid.Make().String(),
		},
		UserID:    userID,
		ProjectID: projectID,
		TokenType: "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodRS256, claims)
	token.Header["kid"] = s.keyManager.GetKeyID()

	signedToken, err := token.SignedString(s.keyManager.GetPrivateKey())
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return signedToken, nil
}

// VerifyAccessToken verifies and parses an access token
func (s *JWTService) VerifyAccessToken(tokenString string) (*AccessTokenClaims, error) {
	if !s.keyManager.IsLoaded() {
		return nil, fmt.Errorf("keys not loaded")
	}

	token, err := jwt.ParseWithClaims(tokenString, &AccessTokenClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		if kid, ok := token.Header["kid"].(string); ok {
			if kid != s.keyManager.GetKeyID() {
				return nil, fmt.Errorf("unknown key ID: %s", kid)
			}
		}

		return s.keyManager.GetPublicKey(), nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*AccessTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// VerifyRefreshToken verifies and parses a refresh token
func (s *JWTService) VerifyRefreshToken(tokenString string) (*RefreshTokenClaims, error) {
	if !s.keyManager.IsLoaded() {
		return nil, fmt.Errorf("keys not loaded")
	}

	token, err := jwt.ParseWithClaims(tokenString, &RefreshTokenClaims{}, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodRSA); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		if kid, ok := token.Header["kid"].(string); ok {
			if kid != s.keyManager.GetKeyID() {
				return nil, fmt.Errorf("unknown key ID: %s", kid)
			}
		}

		return s.keyManager.GetPublicKey(), nil
	})
	if err != nil {
		return nil, fmt.Errorf("failed to parse refresh token: %w", err)
	}

	claims, ok := token.Claims.(*RefreshTokenClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid refresh token claims")
	}

	if claims.TokenType != "refresh" {
		return nil, fmt.Errorf("token is not a refresh token")
	}

	return claims, nil
}

// GetKeyManager returns the key manager (for JWKS handler)
func (s *JWTService) GetKeyManager() *KeyManager {
	return s.keyManager
}
