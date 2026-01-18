# Research: Permit Embedded Authentication

**Feature**: 001-embedded-auth
**Date**: 2026-01-17

## Executive Summary

Research completed for Permit embedded authentication system. The codebase already has foundational elements in place: OTP authentication flow, basic project management, and SDK with React provider. This research documents decisions for completing the feature set.

---

## Technology Stack (Confirmed)

| Component | Technology | Status |
|-----------|------------|--------|
| API | Go 1.24 + chi v5 | ✅ Existing |
| Database | PostgreSQL 16 + pgx v5 | ✅ Existing |
| Email | Resend (resend-go/v3) | ✅ Existing |
| SDK | React + Vite + TailwindCSS | ✅ Existing |
| Infrastructure | Docker Compose | ✅ Existing |
| Auth Tokens | JWT (golang-jwt/v5) | ✅ Existing |
| Validation | go-playground/validator | ✅ Existing |

---

## R1: OAuth2 Social Login Implementation

**Decision**: Implement OAuth2 Authorization Code flow with PKCE for Google and GitHub.

**Rationale**:
- Authorization Code with PKCE is the recommended flow for SPAs and native apps
- No client secret exposure in frontend
- Google and GitHub both support this flow
- State parameter prevents CSRF attacks

**Alternatives Considered**:
- Implicit flow: Deprecated, less secure
- Server-side only flow: Requires full page redirects, breaks embedded experience

**Implementation Approach**:
1. SDK initiates OAuth via popup window (not redirect to preserve modal context)
2. OAuth callback endpoint on API receives authorization code
3. API exchanges code for tokens, extracts user info
4. API creates/links user, issues session tokens
5. Popup posts tokens back to parent window, closes

---

## R2: Session Token Strategy

**Decision**: Dual-token system with short-lived access tokens and long-lived refresh tokens.

**Rationale**:
- Access token (15 min): Used for API authorization
- Refresh token (7 days): Used to obtain new access tokens
- Matches existing `refresh_tokens` table schema
- Minimizes risk of token theft

**Token Storage**:
- SDK stores in localStorage per project (existing pattern in `PermitProvider`)
- Backend verifies via JWT signature (existing `JWTService`)
- Refresh tokens hashed in database (existing column `token_hash`)

---

## R3: Identity Linking Strategy

**Decision**: Email as primary identifier for account linking.

**Rationale**:
- Both OTP and social providers provide email
- Simple matching logic: same email = same user
- Existing `users` table uses email as unique key

**Edge Case Handling**:
- Social login with existing email: Link provider to existing user
- Different emails from social: Create new user, warn about separate accounts

**New Table Required**: `identities` to track linked providers per user.

---

## R4: Rate Limiting Strategy

**Decision**: In-memory rate limiter for MVP, Redis-backed for production scale.

**Rationale**:
- Spec requires max 5 OTP requests per email per hour
- In-memory using `golang.org/x/time/rate` for simplicity
- Can migrate to Redis later without API changes

**Limits Applied**:
- OTP initiation: 5/hour per email
- OTP verification: 10 attempts per code
- OAuth initiation: 20/hour per IP

---

## R5: Dashboard Authentication

**Decision**: Dashboard uses the same Permit auth system (dogfooding).

**Rationale**:
- Developers authenticate via OTP/social to access dashboard
- First user becomes project owner
- Consistent with product philosophy

**Implementation**:
- Dashboard is a separate React app (or route in SDK)
- Uses PermitProvider with a dedicated "dashboard" project ID
- Additional admin middleware checks project ownership

---

## R6: API Response Format

**Decision**: Unified JSON response structure per constitution.

**Rationale**: Constitution IV.1 mandates consistent response formats.

```json
{
  "data": { ... },
  "error": null
}
// or
{
  "data": null,
  "error": {
    "code": "invalid_otp",
    "message": "The verification code is invalid or expired"
  }
}
```

**Implementation**: Create response helpers in `handler/` package.

---

## R7: Widget Customization

**Decision**: Theme config stored in `widgets` table (existing), applied via CSS variables.

**Rationale**:
- Existing `ThemeConfig` struct supports: `primary_color`, `logo_url`, `border_radius`, `dark_mode`
- CSS variables allow runtime theming without rebuilding SDK
- Widget fetches config from `/api/v1/projects/{id}` endpoint

---

## Existing Codebase Inventory

### Database Tables (from 001_init_tables.sql)

| Table | Status | Notes |
|-------|--------|-------|
| users | ✅ Exists | id, email, timestamps |
| projects | ✅ Exists | Needs allowed_providers column |
| project_users | ✅ Exists | Links users to projects |
| project_api_keys | ✅ Exists | Client credentials |
| widgets | ✅ Exists | Theme config, enabled_providers |
| otp_codes | ✅ Exists | OTP verification |
| refresh_tokens | ✅ Exists | Session management |
| **identities** | 🆕 New | Track OAuth providers per user |

### API Endpoints (from routes.go)

| Endpoint | Status | Notes |
|----------|--------|-------|
| GET /health | ✅ Exists | Health check |
| GET /api/v1/auth/me | ✅ Exists | Needs implementation |
| POST /api/v1/auth/otp/start | ✅ Exists | Send OTP |
| POST /api/v1/auth/otp/verify | ✅ Exists | Verify OTP |
| POST /api/v1/projects | ✅ Exists | Create project |
| GET /api/v1/projects/{id} | ✅ Exists | Get project config |
| **GET /api/v1/auth/oauth/{provider}** | 🆕 New | Initiate OAuth |
| **GET /api/v1/auth/oauth/{provider}/callback** | 🆕 New | OAuth callback |
| **POST /api/v1/auth/refresh** | 🆕 New | Refresh tokens |
| **POST /api/v1/auth/logout** | 🆕 New | Revoke session |

### SDK Components (from sdk/src/)

| Component | Status | Notes |
|-----------|--------|-------|
| PermitProvider | ✅ Exists | Context provider |
| PermitModal | ✅ Exists | Auth modal |
| usePermit | ✅ Exists | Hook for auth state |
| **SocialLoginButton** | 🆕 New | OAuth provider buttons |
| **OTPInput** | Check | May exist in components/ |

---

## Testing Strategy

### Existing Tests

- `sdk/src/__tests__/PermitModal.test.tsx` - Modal behavior
- `sdk/src/__tests__/PermitProvider.test.tsx` - Provider state
- `sdk/src/__tests__/usePermit.test.tsx` - Hook behavior

### Proposed Tests

**API (Go)**:
- Unit tests for `auth_service.go` (OTP generation, verification logic)
- Integration tests for auth endpoints (using testcontainers-go + PostgreSQL)

**SDK (React)**:
- Extend modal tests for social login buttons
- Test OAuth popup flow with mocked window

---

## Dependencies to Add

**API (go.mod)**:
- `golang.org/x/oauth2` - OAuth2 client
- `golang.org/x/time/rate` - Rate limiting

**No new SDK dependencies required** - existing setup sufficient.

---

## Open Questions (Resolved)

| Question | Resolution |
|----------|------------|
| OTP expiry time | 10 minutes (spec assumption, matches existing code) |
| Session duration | 7 days (spec assumption) |
| Social providers | Google + GitHub (spec explicit) |
| Rate limit storage | In-memory for MVP |
