package infra

import (
	"fmt"

	"github.com/resend/resend-go/v3"
)

// EmailService handles sending emails via Resend
type EmailService struct {
	client   *resend.Client
	fromAddr string
}

// NewEmailService creates a new email service with Resend
func NewEmailService(apiKey, fromAddr string) *EmailService {
	return &EmailService{
		client:   resend.NewClient(apiKey),
		fromAddr: fromAddr,
	}
}

// SendOTP sends an OTP code to the specified email address
func (s *EmailService) SendOTP(to, code, projectName string) error {
	html := fmt.Sprintf(`
		<div style="font-family: sans-serif; max-width: 400px; margin: 0 auto;">
			<h2>Your verification code</h2>
			<p>Enter this code to sign in to %s:</p>
			<div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 20px; background: #f4f4f4; text-align: center; border-radius: 8px;">
				%s
			</div>
			<p style="color: #666; font-size: 14px; margin-top: 20px;">
				This code expires in 10 minutes. If you didn't request this code, you can safely ignore this email.
			</p>
		</div>
	`, projectName, code)

	params := &resend.SendEmailRequest{
		From:    s.fromAddr,
		To:      []string{to},
		Subject: fmt.Sprintf("Your %s verification code: %s", projectName, code),
		Html:    html,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		return fmt.Errorf("failed to send OTP email: %w", err)
	}

	return nil
}
