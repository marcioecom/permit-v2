package service

import (
	"context"
	"fmt"

	"github.com/marcioecom/permit/internal/crypto"
	"github.com/marcioecom/permit/internal/repository"
)

type SessionService struct {
	jwtService *crypto.JWTService
	userRepo   repository.UserRepository
}

func NewSessionService(jwtService *crypto.JWTService, userRepo repository.UserRepository) *SessionService {
	return &SessionService{
		jwtService: jwtService,
		userRepo:   userRepo,
	}
}

type RefreshTokenInput struct {
	RefreshToken string
}

type RefreshTokenOutput struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
}

func (s *SessionService) RefreshToken(ctx context.Context, input RefreshTokenInput) (*RefreshTokenOutput, error) {
	claims, err := s.jwtService.VerifyRefreshToken(input.RefreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid_refresh_token")
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user_not_found")
	}

	accessToken, err := s.jwtService.SignAccessToken(user.Email, user.ID, claims.ProjectID, "", "refresh")
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
	}

	refreshToken, err := s.jwtService.SignRefreshToken(user.ID, claims.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("token_generation_failed")
	}

	return &RefreshTokenOutput{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

type GetMeOutput struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func (s *SessionService) GetMe(ctx context.Context, userID string) (*GetMeOutput, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil || user == nil {
		return nil, fmt.Errorf("user_not_found")
	}

	return &GetMeOutput{
		ID:    user.ID,
		Email: user.Email,
	}, nil
}
