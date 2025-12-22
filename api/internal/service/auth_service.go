package service

import (
	"context"
	"crypto/rand"
	"math/big"
	"strings"
	"time"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
)

type AuthService struct {
	userRepo repository.UserRepository
	otpRepo  repository.OTPCodeRepository
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
	code := strings.Join(digits, ", ")

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
