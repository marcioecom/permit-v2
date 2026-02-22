# Research: Developer Dashboard

**Feature**: 003-developer-dashboard
**Date**: 2026-01-24

## Decisions

### 1. Dashboard Technology Stack

**Decision**: Next.js 15 with App Router

**Rationale**:
- Consistent with modern React patterns
- Server Components for efficient data fetching
- App Router provides better layouts and loading states
- Already have Next.js example in `examples/nextjs` to reference

**Alternatives Considered**:
- Vite SPA: Rejected - need SSR for auth callbacks and SEO
- Create React App: Deprecated, not recommended for new projects

---

### 2. Dashboard Location in Monorepo

**Decision**: New `apps/dashboard` directory

**Rationale**:
- Separates dashboard from SDK packages
- Clear distinction between library code and application code
- Follows monorepo best practices (apps vs packages)
- Can have independent deployment

**Alternatives Considered**:
- Inside `examples/`: Rejected - this is a production app, not an example
- Inside `packages/`: Rejected - this is an application, not a reusable package

---

### 3. Token Refresh Strategy

**Decision**: Axios response interceptor with automatic retry

**Rationale**:
- Existing codebase uses axios (`packages/react/package.json`)
- Interceptors handle 401 transparently
- Refresh happens before request fails, user doesn't notice
- Single point of configuration

**Alternatives Considered**:
- Manual check before each request: Rejected - too verbose, easy to miss
- react-query's retry mechanism: Considered but interceptor is more transparent

---

### 4. Dashboard Authentication Approach

**Decision**: Use PermitModal component from SDK (dogfooding)

**Rationale**:
- Validates our own product works (dogfooding)
- Consistent auth experience
- Already has OTP flow implemented
- Demonstrates SDK capabilities to customers

**Alternatives Considered**:
- Custom auth form: Rejected - defeats dogfooding purpose
- Third-party auth (Auth0, etc.): Rejected - we are the auth provider

---

### 5. API Endpoint Structure

**Decision**: Dedicated `/dashboard` route prefix

**Rationale**:
- Clear separation from SDK-facing APIs
- Owner-authenticated (not project-authenticated)
- Different authorization model (owner sees all their projects)
- Easier to add dashboard-specific endpoints later

**Alternatives Considered**:
- Reuse existing `/projects` routes: Rejected - different auth context (owner vs API key)
- GraphQL: Rejected - overkill for this scope, REST is simpler

---

### 6. Pagination Strategy

**Decision**: Offset-based pagination with limit/page params

**Rationale**:
- Simple to implement and understand
- Works well for tables with sorting
- Existing patterns in codebase use this approach
- Good enough for expected data sizes (up to 1000 users per project)

**Alternatives Considered**:
- Cursor-based: Rejected - more complex, not needed for our scale
- Infinite scroll: Rejected - tables work better with explicit pagination

---

## Technical Notes

### Existing Refresh Token Implementation

The backend already supports refresh tokens:
- `session_service.go` has `RefreshToken` method
- Returns new access and refresh tokens
- Validates refresh token claims

### Required SDK Changes

The SDK currently doesn't use refresh tokens:
- Need to store refresh token in localStorage (or context)
- Add axios interceptor to catch 401 and retry with refresh
- Handle case when refresh token also expires (redirect to login)

### Database Schema Notes

Need to track:
- `auth_method` on users table (which provider was used for last login)
- `last_login_at` timestamp for dashboard visibility
- Consider: `login_count` for engagement metrics (optional)
