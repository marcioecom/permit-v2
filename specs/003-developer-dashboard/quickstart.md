# Quickstart: Developer Dashboard

**Feature**: 003-developer-dashboard
**Date**: 2026-01-24

## Prerequisites

- Node.js 18+
- pnpm 8+
- Go 1.24+
- PostgreSQL running (via Docker or local)
- API server running on port 8080

## Setup

### 1. Start Infrastructure

```bash
# Start PostgreSQL (if using Docker)
cd api && docker compose up -d

# Run migrations
cd api && go run cmd/permit/main.go migrate up
```

### 2. Start API Server

```bash
cd api && go run cmd/permit/main.go serve
# API running on http://localhost:8080
```

### 3. Start Dashboard

```bash
cd apps/dashboard
pnpm install
pnpm dev
# Dashboard running on http://localhost:3001
```

### 4. Access Dashboard

1. Open http://localhost:3001
2. Enter your email to receive OTP
3. Check email (or MailHog at http://localhost:8025 for local dev)
4. Enter OTP code
5. You're in! Browse your projects.

## Development

### Run Tests

```bash
# API tests
cd api && go test ./... -v

# SDK tests
cd packages/react && pnpm test

# Dashboard tests (if applicable)
cd apps/dashboard && pnpm test
```

### Build for Production

```bash
# Build SDK
cd packages/react && pnpm build

# Build Dashboard
cd apps/dashboard && pnpm build
```

## Configuration

### Environment Variables

**API** (`api/.env`):
```env
DATABASE_URL=postgres://user:pass@localhost:5432/permit
JWT_SECRET=your-secret-key
RESEND_API_KEY=re_xxx (or skip for MailHog)
```

**Dashboard** (`apps/dashboard/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_PERMIT_PROJECT_ID=your-project-id
```

## Common Tasks

### Create a Test Project

```bash
# Via API (after getting JWT from login)
curl -X POST http://localhost:8080/dashboard/projects \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project"}'
```

### Generate API Key

Via dashboard UI at `/projects/{id}/api-keys` or:

```bash
curl -X POST http://localhost:8080/dashboard/projects/{id}/api-keys \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Dev Key"}'
```

## Troubleshooting

### "Unauthorized" errors
- Check JWT is valid and not expired
- Verify you're using owner JWT, not project API key

### Token refresh not working
- Check refresh token is stored in localStorage
- Verify `/auth/refresh` endpoint is accessible
- Check refresh token hasn't expired (7 days)

### CORS issues
- Verify `allowed_origins` includes your dashboard URL
- Check API CORS middleware configuration
