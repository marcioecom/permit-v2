# Implementation Plan: Developer Dashboard

**Branch**: `003-developer-dashboard` | **Date**: 2026-01-24 | **Spec**: [spec.md](file:///Users/marciojunior/code/marcioecom/permit-v2/specs/003-developer-dashboard/spec.md)
**Input**: Feature specification from `/specs/003-developer-dashboard/spec.md`

## Summary

Build a developer dashboard where Permit customers can manage their projects, view project users, and manage API keys. The dashboard uses Permit's own authentication (dogfooding) and implements automatic JWT refresh using refresh tokens for seamless UX. This involves:

1. **Dashboard Application**: New Next.js app at `apps/dashboard` with auth integration
2. **API Enhancements**: New endpoints for dashboard-specific operations
3. **SDK Improvements**: Implement automatic refresh token handling in React SDK
4. **Database Updates**: Add support for listing project users with auth method info

## Technical Context

**Language/Version**: Go 1.24 (API), TypeScript 5.x (Dashboard, SDK)
**Primary Dependencies**: chi v5, pgx v5, zerolog (API) | Next.js, React 18, TailwindCSS, axios, react-query (Dashboard)
**Storage**: PostgreSQL (existing)
**Testing**: Go test (API), vitest (SDK), browser tests (Dashboard)
**Target Platform**: Web (Dashboard), Node.js server (API)
**Project Type**: Monorepo with pnpm workspaces
**Performance Goals**: <2s page load, <1s navigation, supports 100 concurrent users
**Constraints**: Must use existing auth system (dogfooding), consistent with SDK behavior

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality (KISS, Rule of Three, Early Returns) | ✅ PASS | Simple handlers, no premature abstractions |
| II. Domain-Driven Simplicity | ✅ PASS | Clear domain boundaries: Dashboard, Projects, Users, API Keys |
| III. Testing Standards (Behavior Verification) | ✅ PASS | Will add tests following existing patterns |
| IV. User Experience Consistency | ✅ PASS | Unified API response format, clear error messages |
| V. Performance Requirements | ✅ PASS | Fail fast validation, pagination for users list |

## Project Structure

### Documentation (this feature)

```text
specs/003-developer-dashboard/
├── plan.md              # This file
├── spec.md              # Feature specification
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (API contracts)
```

### Source Code

```text
# New Dashboard Application
apps/
└── dashboard/
    ├── app/                    # Next.js App Router
    │   ├── layout.tsx
    │   ├── page.tsx            # Redirect to /projects
    │   ├── login/
    │   │   └── page.tsx        # Login page using Permit SDK
    │   ├── projects/
    │   │   ├── page.tsx        # Projects list
    │   │   └── [id]/
    │   │       ├── page.tsx    # Project details
    │   │       ├── users/
    │   │       │   └── page.tsx
    │   │       └── api-keys/
    │   │           └── page.tsx
    │   └── api/                # API routes for BFF
    ├── components/             # Dashboard UI components
    ├── lib/                    # Dashboard utilities
    └── package.json

# API Enhancements (existing structure)
api/internal/
├── handler/
│   ├── dashboard.go           # [NEW] Dashboard-specific handlers
│   └── project.go             # [MODIFY] Add list API keys, list users
├── service/
│   └── project_service.go     # [MODIFY] Add list users, revoke key
├── repository/
│   └── project_repo.go        # [MODIFY] Add query methods
└── database/migrations/
    └── 003_add_user_stats.sql  # [NEW] Add last_login_at, auth_method tracking

# SDK Enhancements (existing structure)
packages/react/src/
├── lib/
│   └── api.ts                  # [MODIFY] Add automatic refresh token handling
└── PermitProvider.tsx          # [MODIFY] Token refresh on expiration
```

---

## Proposed Changes

### Component 1: Database & Models

New migration to track user authentication method and last login time.

#### [NEW] [003_add_user_stats.sql](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/database/migrations/003_add_user_stats.sql)

Add `last_login_at` and `auth_method` columns to users table for dashboard visibility.

---

### Component 2: API Endpoints

New and modified handlers for dashboard operations.

#### [NEW] [dashboard.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/dashboard.go)

Dashboard-specific handlers:
- `GET /dashboard/projects` - List projects for authenticated owner with user counts
- `GET /dashboard/projects/{id}/users` - List project users with pagination
- `GET /dashboard/projects/{id}/api-keys` - List API keys (masked)
- `DELETE /dashboard/projects/{id}/api-keys/{keyId}` - Revoke API key

#### [MODIFY] [routes.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/routes.go)

Register new dashboard routes with owner authentication middleware.

#### [MODIFY] [project_service.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/service/project_service.go)

Add methods:
- `ListProjectsByOwner(ctx, ownerID)` - List owner's projects with stats
- `ListProjectUsers(ctx, projectID, page, limit)` - Paginated user list
- `ListAPIKeys(ctx, projectID)` - List masked API keys
- `RevokeAPIKey(ctx, projectID, keyID)` - Revoke an API key

#### [MODIFY] [project_repo.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/repository/project_repo.go)

Add repository methods for the new service operations.

---

### Component 3: React SDK Token Refresh

Implement automatic JWT refresh in the SDK.

#### [MODIFY] [api.ts](file:///Users/marciojunior/code/marcioecom/permit-v2/packages/react/src/lib/api.ts)

Add axios interceptor for automatic token refresh on 401 responses.

#### [MODIFY] [PermitProvider.tsx](file:///Users/marciojunior/code/marcioecom/permit-v2/packages/react/src/PermitProvider.tsx)

- Store refresh token in localStorage
- Add `refreshToken` method to context
- Handle token expiration gracefully

---

### Component 4: Dashboard Application

New Next.js application for the developer dashboard.

#### [NEW] [apps/dashboard/](file:///Users/marciojunior/code/marcioecom/permit-v2/apps/dashboard)

Complete Next.js 15 application with:
- App Router structure
- TailwindCSS styling (consistent with SDK)
- Permit SDK integration for auth (dogfooding)
- Server components for data fetching
- Client components for interactivity

Key pages:
- `/login` - Login using PermitModal
- `/projects` - Projects list with stats
- `/projects/[id]` - Project overview
- `/projects/[id]/users` - Users table with pagination
- `/projects/[id]/api-keys` - API keys management

---

## Verification Plan

### Automated Tests

#### API Tests (Go)

```bash
# Run all API tests
cd api && go test ./... -v

# Run specific dashboard handler tests
cd api && go test ./internal/handler -run TestDashboard -v

# Run project service tests
cd api && go test ./internal/service -run TestProject -v
```

New tests to add:
- `internal/handler/dashboard_test.go` - Handler tests for dashboard endpoints
- `internal/service/project_service_test.go` - Add tests for new methods

#### SDK Tests (Vitest)

```bash
# Run all SDK tests
cd packages/react && pnpm test

# Run with coverage
cd packages/react && pnpm test:coverage
```

New tests to add:
- `src/__tests__/token-refresh.test.ts` - Automatic token refresh behavior

### Browser Tests

After dashboard is running (`pnpm dev` in apps/dashboard), verify:

1. **Login Flow**
   - Navigate to `http://localhost:3001`
   - Should redirect to `/login`
   - Enter email, receive OTP, complete login
   - Should redirect to `/projects`

2. **Projects List**
   - After login, see list of projects
   - Each project shows name, user count, created date
   - Click project navigates to details

3. **Users List**
   - Navigate to project's users tab
   - See paginated table of users
   - Shows email, auth method, last login

4. **API Keys Management**
   - Navigate to API keys tab
   - See masked existing keys
   - Create new key, verify it shows once
   - Revoke key, verify confirmation

5. **Token Refresh**
   - Stay on dashboard for >15 minutes (JWT expiry)
   - Make action (click, navigate)
   - Should NOT redirect to login (refresh token used)

### Manual Verification

1. **Multi-tab session**: Open dashboard in 2 tabs, logout in one, verify both are logged out
2. **7-day expiry**: (Skip in dev) After 7 days of inactivity, verify login is required
