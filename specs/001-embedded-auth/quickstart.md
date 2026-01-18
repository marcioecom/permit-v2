# Quickstart - Permit Embedded Auth

## Prerequisites

- Go 1.24+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional, for MailHog)

## 1. Setup API

```bash
# Start database
cd api && docker compose up -d postgres

# Run migrations
psql $DATABASE_URL < internal/database/migrations/001_initial.sql
psql $DATABASE_URL < internal/database/migrations/002_add_identities.sql

# Seed initial data
psql $DATABASE_URL -c "INSERT INTO users (id, email) VALUES ('YOUR_USER_ULID', 'admin@example.com');"
psql $DATABASE_URL -c "INSERT INTO projects (id, owner_id, name) VALUES ('YOUR_PROJECT_ULID', 'YOUR_USER_ULID', 'My App');"

# Start API (with MailHog for local testing)
USE_MAILHOG=true go run ./cmd/server/main.go
```

## 2. Setup SDK

```bash
cd sdk && pnpm install && pnpm dev
```

## 3. Setup Playground

```bash
cd playground && pnpm install && pnpm dev
```

## Validation Checklist

### OTP Flow ✅

- [ ] Open playground at http://localhost:3000
- [ ] Click "Login" button
- [ ] Enter email and submit
- [ ] Check MailHog at http://localhost:8025 for OTP email
- [ ] Enter OTP code in modal
- [ ] Verify user info displays after login
- [ ] Click "Logout" and verify session ends

### API Endpoints ✅

```bash
# Health check
curl http://localhost:8080/health

# Get project widget config
curl http://localhost:8080/api/v1/projects/YOUR_PROJECT_ID/widget

# Start OTP
curl -X POST http://localhost:8080/api/v1/auth/otp/start \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","projectId":"YOUR_PROJECT_ID"}'

# Verify OTP (get code from MailHog)
curl -X POST http://localhost:8080/api/v1/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"code":"123456","projectId":"YOUR_PROJECT_ID"}'

# Get current user (with token from verify)
curl http://localhost:8080/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| CORS errors | Check `allowedOrigins` in project config |
| Email not sent | Ensure `USE_MAILHOG=true` and MailHog is running |
| Invalid token | JWT keys are ephemeral - restart API may invalidate tokens |
