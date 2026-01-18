package infra

import "github.com/marcioecom/permit/internal/config"

type EmailSender interface {
	SendOTP(to, code, projectName string) error
}

func NewEmailService(cfg *config.Config) EmailSender {
	if cfg.UseMailHog {
		return NewSMTPEmailService(cfg.SMTPHost, cfg.SMTPPort, cfg.EmailFrom)
	}
	return NewResendEmailService(cfg.ResendAPIKey, cfg.EmailFrom)
}
