# Quickstart: Permit Embedded Authentication

**Feature**: 001-embedded-auth
**Date**: 2026-01-17

## Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+ & pnpm
- A Resend API key (for email OTP)

---

## 1. Start Infrastructure

```bash
cd api
docker compose up -d
```

This starts PostgreSQL 16 on `localhost:5432`.

---

## 2. Configure Environment

```bash
# api/.env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/permit?sslmode=disable
RESEND_API_KEY=re_xxxxxxxxxxxxx
JWT_SECRET=your-secret-key-at-least-32-chars

# For OAuth (optional)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

---

## 3. Run Migrations

```bash
cd api
go run cmd/migrate/main.go
```

---

## 4. Start API Server

```bash
cd api
go run cmd/server/main.go
```

API available at `http://localhost:8080`.

---

## 5. Start SDK Development Server

```bash
cd sdk
pnpm install
pnpm dev
```

SDK dev server at `http://localhost:5173`.

---

## 6. Test the Flow

### Create a Project (via API)

```bash
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

Note the returned `id`.

### Integrate SDK

```tsx
import { PermitProvider, usePermit } from '@permit/sdk';

function App() {
  return (
    <PermitProvider projectId="YOUR_PROJECT_ID">
      <LoginButton />
    </PermitProvider>
  );
}

function LoginButton() {
  const { login, user, isAuthenticated } = usePermit();

  if (isAuthenticated) {
    return <p>Welcome, {user?.email}</p>;
  }

  return <button onClick={login}>Sign In</button>;
}
```

### Test OTP Flow

1. Click "Sign In" → Modal opens
2. Enter email → OTP sent (check Resend dashboard or logs)
3. Enter 6-digit code → Authenticated

---

## 7. Run Tests

### API Tests (Go)

```bash
cd api
go test ./...
```

### SDK Tests (React)

```bash
cd sdk
pnpm test
```

---

## Validation Checklist

- [ ] PostgreSQL container running
- [ ] Migrations applied successfully
- [ ] API responds to `GET /health`
- [ ] OTP email sent when initiating auth
- [ ] OTP verification returns tokens
- [ ] SDK modal opens and closes
- [ ] Session persists across page refresh
