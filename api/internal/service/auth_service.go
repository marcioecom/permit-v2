package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
)

type AuthService struct {
	jwtService crypto.JWTService
	userRepo   repository.UserRepository
	otpRepo    repository.OTPCodeRepository
}

func NewAuthService(userRepo repository.UserRepository, otpRepo repository.OTPCodeRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
		otpRepo:  otpRepo,
	}
}

type CreateAuthInput struct {
	Email     string
	ProjectID string
}

func (s *AuthService) CreateOTPCode(ctx context.Context, input CreateAuthInput) (string, error) {
	userID, err := s.userRepo.Create(ctx, &models.User{
		ID:    ulid.Make().String(),
		Email: input.Email,
	})
	if err != nil {
		return "", err
	}

	digits := make([]string, 6)
	for i := range digits {
		a, _ := rand.Int(rand.Reader, big.NewInt(9))
		digits[i] = a.String()
	}
	code := strings.Join(digits, "")

	err = s.otpRepo.Create(ctx, &models.OTPCode{
		ID:        ulid.Make().String(),
		UserID:    userID,
		ProjectID: input.ProjectID,
		Code:      code,
		ExpiresAt: time.Now().Add(time.Minute * 10),
	})
	if err != nil {
		return "", err
	}

	return "", nil
}

type VerifyAuthInput struct {
	Code      string
	ProjectID string
}

type VerifyAuthOutput struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	User         *UserInfo `json:"user"`
}

// UserInfo represents basic user information
type UserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (s *AuthService) VerifyOTPCode(ctx context.Context, input VerifyAuthInput) (*VerifyAuthOutput, error) {
	otp, err := s.otpRepo.GetByProjectAndCode(ctx, input.ProjectID, input.Code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("code invalid or expired")
		}
		return nil, err
	}

	if otp.UsedAt != nil {
		return nil, fmt.Errorf("code invalid")
	}

	// result := subtle.ConstantTimeCompare([]byte(input.Code), []byte(otp.Code))
	// if result != equalContent {
	// 	return fmt.Errorf("code invalid or expired")
	// }

	if time.Now().After(otp.ExpiresAt) {
		return nil, fmt.Errorf("code invalid or expired")
	}

	// TODO: use transaction
	if err = s.otpRepo.MarkCodeAsUsed(ctx, otp.ID); err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, otp.UserID)
	if err != nil {
		return nil, err
	}

	accessToken, err := s.jwtService.SignAccessToken(
		user.Email,
		user.ID,
		input.ProjectID,
		"magic_link",
	)
	if err != nil {
		return nil, fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtService.SignRefreshToken(user.ID, input.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("failed to generate refresh token: %w", err)
	}

	return &VerifyAuthOutput{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: &UserInfo{
			ID:    user.ID,
			Email: user.Email,
		},
	}, nil
}
