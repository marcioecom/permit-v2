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
	"github.com/marcioecom/permit/internal/infra"
	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/repository"
	"github.com/oklog/ulid/v2"
	"github.com/rs/zerolog/log"
)

type AuthService struct {
	jwtService   *crypto.JWTService
	emailService *infra.EmailService
	userRepo     repository.UserRepository
	otpRepo      repository.OTPCodeRepository
	identityRepo repository.IdentityRepository
}

func NewAuthService(
	jwtService *crypto.JWTService,
	emailService *infra.EmailService,
	userRepo repository.UserRepository,
	otpRepo repository.OTPCodeRepository,
	identityRepo repository.IdentityRepository,
) *AuthService {
	return &AuthService{
		jwtService:   jwtService,
		emailService: emailService,
		userRepo:     userRepo,
		otpRepo:      otpRepo,
		identityRepo: identityRepo,
	}
}

type CreateAuthInput struct {
	Email       string
	ProjectID   string
	ProjectName string
}

func (s *AuthService) CreateOTPCode(ctx context.Context, input CreateAuthInput) error {
	user, err := s.userRepo.GetByEmail(ctx, input.Email)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}

	var userID string
	if user == nil {
		userID, err = s.userRepo.Create(ctx, &models.User{
			ID:    ulid.Make().String(),
			Email: input.Email,
		})
		if err != nil {
			return err
		}
	} else {
		userID = user.ID
	}

	digits := make([]string, 6)
	for i := range digits {
		n, _ := rand.Int(rand.Reader, big.NewInt(10))
		digits[i] = n.String()
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
		return err
	}

	projectName := input.ProjectName
	if projectName == "" {
		projectName = "Permit"
	}

	if err := s.emailService.SendOTP(input.Email, code, projectName); err != nil {
		return fmt.Errorf("email_delivery_failed")
	}

	return nil
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

type UserInfo struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (s *AuthService) VerifyOTPCode(ctx context.Context, input VerifyAuthInput) (*VerifyAuthOutput, error) {
	otp, err := s.otpRepo.GetByProjectAndCode(ctx, input.ProjectID, input.Code)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("invalid_code")
		}
		return nil, err
	}

	if otp.UsedAt != nil {
		return nil, fmt.Errorf("code_already_used")
	}

	if time.Now().After(otp.ExpiresAt) {
		return nil, fmt.Errorf("code_expired")
	}

	if err = s.otpRepo.MarkCodeAsUsed(ctx, otp.ID); err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, otp.UserID)
	if err != nil {
		return nil, err
	}

	existingIdentity, _ := s.identityRepo.GetByUserAndProvider(ctx, user.ID, models.ProviderEmail)
	if existingIdentity == nil {
		if err := s.identityRepo.Create(ctx, &models.Identity{
			ID:       ulid.Make().String(),
			UserID:   user.ID,
			Provider: models.ProviderEmail,
			Email:    user.Email,
		}); err != nil {
			log.Warn().Err(err).Str("userId", user.ID).Msg("failed to link email identity")
		}
	}

	accessToken, err := s.jwtService.SignAccessToken(user.Email, user.ID, input.ProjectID, "email")
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
	}

	refreshToken, err := s.jwtService.SignRefreshToken(user.ID, input.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
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
