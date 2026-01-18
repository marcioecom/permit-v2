package infra

import (
	"fmt"
	"net/smtp"
)

type SMTPEmailService struct {
	host     string
	port     string
	fromAddr string
}

func NewSMTPEmailService(host, port, fromAddr string) *SMTPEmailService {
	return &SMTPEmailService{
		host:     host,
		port:     port,
		fromAddr: fromAddr,
	}
}

func (s *SMTPEmailService) SendOTP(to, code, projectName string) error {
	subject := fmt.Sprintf("Your %s verification code: %s", projectName, code)

	htmlBody := fmt.Sprintf(`
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

	msg := []byte(fmt.Sprintf(
		"From: %s\r\n"+
			"To: %s\r\n"+
			"Subject: %s\r\n"+
			"MIME-Version: 1.0\r\n"+
			"Content-Type: text/html; charset=UTF-8\r\n"+
			"\r\n"+
			"%s",
		s.fromAddr, to, subject, htmlBody,
	))

	addr := fmt.Sprintf("%s:%s", s.host, s.port)
	err := smtp.SendMail(addr, nil, s.fromAddr, []string{to}, msg)
	if err != nil {
		return fmt.Errorf("failed to send email via SMTP: %w", err)
	}

	return nil
}
