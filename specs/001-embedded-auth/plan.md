# Implementation Plan: Permit Embedded Authentication

**Branch**: `001-embedded-auth` | **Date**: 2026-01-17 | **Spec**: [spec.md](file:///Users/marciojunior/code/marcioecom/permit-v2/specs/001-embedded-auth/spec.md)
**Input**: Feature specification from `/specs/001-embedded-auth/spec.md`

## Summary

Implement a complete embedded authentication system (Privy/Clerk style) with passwordless focus. The system provides Email OTP and Social Login (Google, GitHub) via a React SDK widget that integrates into client applications. Developers manage projects through a dashboard and receive credentials for SDK integration.

**Existing State**: The codebase has foundational elements (OTP flow, basic models, SDK provider). This plan extends it to production-ready.

---

## Technical Context

**Language/Version**: Go 1.24, TypeScript 5.x
**Primary Dependencies**: chi v5 (router), pgx v5 (database), resend-go (email), React 18, TailwindCSS
**Storage**: PostgreSQL 16
**Testing**: Go `testing` package, Vitest (React)
**Target Platform**: Web (API + React SPA)
**Project Type**: Web application (api/ + sdk/ + playground/)
**Performance Goals**: 1,000 concurrent auth requests, <200ms API response
**Constraints**: OTP delivery <30s, widget load <1s
**Scale/Scope**: Multi-tenant (projects), ~1000 projects, ~100k users

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality (KISS) | ✅ | Simple handler→service→repo pattern, no over-abstraction |
| II. Domain-Driven Simplicity | ✅ | Clear modules: auth, projects, users. Ubiquitous language used |
| III. Testing Standards | ✅ | Behavior tests for auth flows, AAA structure |
| IV. User Experience Consistency | ✅ | Unified JSON response format defined in contracts |
| V. Performance Requirements | ✅ | Input validation at handlers, single queries per operation |

---

## Project Structure

### Documentation (this feature)

```text
specs/001-embedded-auth/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research
├── data-model.md        # Entity definitions
├── quickstart.md        # Developer guide
├── contracts/
│   └── api.yaml         # OpenAPI specification
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
api/
├── cmd/
│   ├── server/          # Main API server
│   └── migrate/         # Migration runner
├── internal/
│   ├── config/          # Environment configuration
│   ├── crypto/          # JWT service
│   ├── database/        # DB connection, migrations
│   │   └── migrations/  # SQL files
│   ├── handler/         # HTTP handlers
│   │   └── middleware/  # Auth, CORS, rate limit
│   ├── models/          # Domain entities
│   ├── repository/      # Data access
│   └── service/         # Business logic
└── compose.yml          # Docker Compose

sdk/
├── src/
│   ├── components/      # React components
│   ├── context/         # PermitContext
│   ├── hooks/           # usePermit
│   ├── lib/             # API client, auth utils
│   └── __tests__/       # Unit tests
└── package.json

playground/              # Demo app for testing
```

**Structure Decision**: Web app structure with `api/` backend and `sdk/` frontend. Existing structure preserved.

---

## Proposed Changes

### API (Backend)

---

#### [NEW] [002_add_identities.sql](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/database/migrations/002_add_identities.sql)

New migration adding `identities` table and `allowed_providers` column to projects.

---

#### [NEW] [identity.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/models/identity.go)

Identity model representing linked auth methods (email, google, github).

---

#### [NEW] [identity_repo.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/repository/identity_repo.go)

Repository for identity CRUD operations.

---

#### [NEW] [oauth_service.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/service/oauth_service.go)

OAuth2 service handling Google/GitHub authentication flows with PKCE.

---

#### [NEW] [oauth.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/oauth.go)

OAuth handlers for `/auth/oauth/{provider}` and callback endpoints.

---

#### [NEW] [session_service.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/service/session_service.go)

Session management: token refresh, logout, session validation.

---

#### [NEW] [session.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/session.go)

Session handlers for `/auth/refresh`, `/auth/logout`, `/auth/me`.

---

#### [NEW] [rate_limiter.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/middleware/rate_limiter.go)

In-memory rate limiter middleware for OTP and OAuth endpoints.

---

#### [MODIFY] [routes.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/routes.go)

Add new OAuth, session, and project routes.

---

#### [MODIFY] [auth_service.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/service/auth_service.go)

- Add identity linking on OTP success
- Integrate email sending via Resend
- Add JWTService injection

---

#### [MODIFY] [auth.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/auth.go)

- Implement `/auth/me` endpoint
- Add unified response format
- Add input validation

---

#### [MODIFY] [helper.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/helper.go)

Add unified response helpers (`writeSuccess`, `writeError`).

---

#### [MODIFY] [project.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/project.go)

- Add PATCH endpoint for project updates
- Add widget configuration endpoints
- Add API key management

---

### SDK (Frontend)

---

#### [NEW] [SocialButton.tsx](file:///Users/marciojunior/code/marcioecom/permit-v2/sdk/src/components/SocialButton.tsx)

Social login button component (Google, GitHub) with icons.

---

#### [NEW] [useOAuth.ts](file:///Users/marciojunior/code/marcioecom/permit-v2/sdk/src/hooks/useOAuth.ts)

Hook for OAuth popup flow: open popup, listen for postMessage, handle tokens.

---

#### [MODIFY] [PermitModal.tsx](file:///Users/marciojunior/code/marcioecom/permit-v2/sdk/src/components/PermitModal.tsx)

- Add social login buttons based on project config
- Fetch project config on mount
- Apply theme from project config

---

#### [MODIFY] [PermitProvider.tsx](file:///Users/marciojunior/code/marcioecom/permit-v2/sdk/src/PermitProvider.tsx)

- Add token refresh logic
- Handle OAuth success messages
- Improve error handling

---

#### [MODIFY] [auth.ts](file:///Users/marciojunior/code/marcioecom/permit-v2/sdk/src/lib/auth.ts)

- Add refresh token API call
- Add logout API call
- Add project config fetch

---

### Infrastructure

---

#### [MODIFY] [compose.yml](file:///Users/marciojunior/code/marcioecom/permit-v2/api/compose.yml)

Add Mailhog service for local email testing (optional).

---

## Verification Plan

### Automated Tests

**API Unit Tests** (Go):

```bash
cd api && go test ./internal/service/... -v
```

Tests to create:
- `auth_service_test.go`: OTP generation, verification, identity linking
- `oauth_service_test.go`: Token exchange, user info extraction

**API Integration Tests** (Go with testcontainers):

```bash
cd api && go test ./internal/handler/... -v -tags=integration
```

Tests to create:
- `auth_handler_test.go`: Full OTP flow, rate limiting
- `oauth_handler_test.go`: OAuth redirect, callback handling

**SDK Unit Tests** (React):

```bash
cd sdk && pnpm test
```

Existing tests:
- `PermitModal.test.tsx` - Extend for social buttons
- `PermitProvider.test.tsx` - Extend for refresh logic

### Manual Verification

**OTP Flow Test**:
1. Start API: `cd api && go run cmd/server/main.go`
2. Start SDK: `cd sdk && pnpm dev`
3. Open `http://localhost:5173`
4. Click login button → Modal opens
5. Enter email → Check Resend dashboard for OTP email
6. Enter code → Verify tokens are stored in localStorage
7. Refresh page → Verify user remains authenticated
8. Click logout → Verify tokens cleared

**Social Login Test** (requires OAuth credentials):
1. Configure Google OAuth in dashboard
2. Click "Continue with Google" in widget
3. Complete Google auth in popup
4. Verify popup closes and user is authenticated
5. Verify identity linked in database: `SELECT * FROM identities`

**Session Refresh Test**:
1. Authenticate via any method
2. Wait for access token expiry (or manually decode and check)
3. Make authenticated API call → Verify token auto-refreshes
4. Check new tokens in localStorage

---

## Complexity Tracking

No constitution violations. All patterns align with KISS and existing codebase structure.

---

## Dependencies

**New Go Dependencies**:
```bash
cd api
go get golang.org/x/oauth2
go get golang.org/x/time/rate
```

**No new SDK dependencies required**.
