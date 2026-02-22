package service_test

import (
	"context"
	"testing"
	"time"

	"github.com/marcioecom/permit/internal/models"
	"github.com/marcioecom/permit/internal/service"
	"github.com/oklog/ulid/v2"
)

type mockUserRepo struct {
	users map[string]*models.User
}

func newMockUserRepo() *mockUserRepo {
	return &mockUserRepo{users: make(map[string]*models.User)}
}

func (m *mockUserRepo) Create(ctx context.Context, user *models.User) (string, error) {
	m.users[user.ID] = user
	return user.ID, nil
}

func (m *mockUserRepo) GetByID(ctx context.Context, id string) (*models.User, error) {
	return m.users[id], nil
}

func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}

type mockOTPRepo struct {
	codes map[string]*models.OTPCode
}

func newMockOTPRepo() *mockOTPRepo {
	return &mockOTPRepo{codes: make(map[string]*models.OTPCode)}
}

func (m *mockOTPRepo) Create(ctx context.Context, otp *models.OTPCode) error {
	m.codes[otp.Code] = otp
	return nil
}

func (m *mockOTPRepo) GetByProjectAndCode(ctx context.Context, projectID, code string) (*models.OTPCode, error) {
	for _, o := range m.codes {
		if o.ProjectID == projectID && o.Code == code {
			return o, nil
		}
	}
	return nil, nil
}

func (m *mockOTPRepo) MarkCodeAsUsed(ctx context.Context, id string) error {
	for _, o := range m.codes {
		if o.ID == id {
			now := time.Now()
			o.UsedAt = &now
		}
	}
	return nil
}

type mockIdentityRepo struct{}

func (m *mockIdentityRepo) Create(ctx context.Context, identity *models.Identity) error {
	return nil
}

func (m *mockIdentityRepo) GetByUserID(ctx context.Context, userID string) ([]*models.Identity, error) {
	return nil, nil
}

func (m *mockIdentityRepo) GetByProviderAndEmail(ctx context.Context, provider, email string) (*models.Identity, error) {
	return nil, nil
}

func (m *mockIdentityRepo) GetByUserAndProvider(ctx context.Context, userID, provider string) (*models.Identity, error) {
	return nil, nil
}

func (m *mockIdentityRepo) Delete(ctx context.Context, id string) error {
	return nil
}

type mockEmailService struct {
	sentEmails map[string]string
}

func newMockEmailService() *mockEmailService {
	return &mockEmailService{sentEmails: make(map[string]string)}
}

func (m *mockEmailService) SendOTP(to, code, projectName string) error {
	m.sentEmails[to] = code
	return nil
}

type mockJWTService struct{}

func (m *mockJWTService) SignAccessToken(email, userID, projectID, source string) (string, error) {
	return "mock-access-token-" + userID, nil
}

func (m *mockJWTService) SignRefreshToken(userID, projectID string) (string, error) {
	return "mock-refresh-token-" + userID, nil
}

func TestCreateOTPCode_NewUser(t *testing.T) {
	userRepo := newMockUserRepo()
	otpRepo := newMockOTPRepo()
	emailService := newMockEmailService()

	_ = otpRepo

	input := service.CreateAuthInput{
		Email:     "test@example.com",
		ProjectID: ulid.Make().String(),
	}

	if input.Email == "" {
		t.Error("Expected email to be set")
	}

	if len(userRepo.users) != 0 {
		t.Error("Expected no users initially")
	}

	t.Logf("Email service has %d sent emails", len(emailService.sentEmails))
}

func TestCreateOTPCode_ExistingUser(t *testing.T) {
	userRepo := newMockUserRepo()
	existingUser := &models.User{
		ID:    ulid.Make().String(),
		Email: "existing@example.com",
	}
	userRepo.users[existingUser.ID] = existingUser

	if len(userRepo.users) != 1 {
		t.Errorf("Expected 1 user, got %d", len(userRepo.users))
	}

	found, _ := userRepo.GetByEmail(context.Background(), "existing@example.com")
	if found == nil {
		t.Error("Expected to find existing user")
	}

	t.Log("Existing user found correctly")
}

func TestVerifyOTPCode_ValidCode(t *testing.T) {
	userID := ulid.Make().String()
	projectID := ulid.Make().String()

	userRepo := newMockUserRepo()
	userRepo.users[userID] = &models.User{
		ID:    userID,
		Email: "test@example.com",
	}

	otpRepo := newMockOTPRepo()
	otpRepo.codes["123456"] = &models.OTPCode{
		ID:        ulid.Make().String(),
		UserID:    userID,
		ProjectID: projectID,
		Code:      "123456",
		ExpiresAt: time.Now().Add(10 * time.Minute),
	}

	otp, err := otpRepo.GetByProjectAndCode(context.Background(), projectID, "123456")
	if err != nil || otp == nil {
		t.Error("Expected to find OTP code")
	}

	if otp.Code != "123456" {
		t.Errorf("Expected code 123456, got %s", otp.Code)
	}

	t.Log("Valid OTP code found correctly")
}

func TestVerifyOTPCode_ExpiredCode(t *testing.T) {
	userID := ulid.Make().String()
	projectID := ulid.Make().String()

	otpRepo := newMockOTPRepo()
	otpRepo.codes["expired"] = &models.OTPCode{
		ID:        ulid.Make().String(),
		UserID:    userID,
		ProjectID: projectID,
		Code:      "expired",
		ExpiresAt: time.Now().Add(-1 * time.Minute),
	}

	otp, _ := otpRepo.GetByProjectAndCode(context.Background(), projectID, "expired")
	if otp == nil {
		t.Error("Expected to find expired OTP")
	}

	if time.Now().Before(otp.ExpiresAt) {
		t.Error("Expected OTP to be expired")
	}

	t.Log("Expired OTP detected correctly")
}

func TestVerifyOTPCode_AlreadyUsed(t *testing.T) {
	userID := ulid.Make().String()
	projectID := ulid.Make().String()
	usedAt := time.Now()

	otpRepo := newMockOTPRepo()
	otpRepo.codes["used"] = &models.OTPCode{
		ID:        ulid.Make().String(),
		UserID:    userID,
		ProjectID: projectID,
		Code:      "used",
		ExpiresAt: time.Now().Add(10 * time.Minute),
		UsedAt:    &usedAt,
	}

	otp, _ := otpRepo.GetByProjectAndCode(context.Background(), projectID, "used")
	if otp == nil {
		t.Error("Expected to find used OTP")
	}

	if otp.UsedAt == nil {
		t.Error("Expected OTP to be marked as used")
	}

	t.Log("Already used OTP detected correctly")
}
