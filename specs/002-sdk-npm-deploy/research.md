# Research: SDK NPM Deploy

**Feature**: 002-sdk-npm-deploy
**Date**: 2026-01-18

## Technical Decisions

### 1. JWKS Endpoint Exposure

**Decision**: Expose JWKS via `/.well-known/jwks.json` route
**Rationale**: Standard OIDC convention makes SDK implementation easier; developers expect this path
**Alternatives considered**:
- `/api/v1/jwks` - Not standard, requires documentation
- `/certs` - Used by some providers but less common

### 2. Server SDK JWT Library

**Decision**: Use `jose` (node-jose successor) for JWT verification
**Rationale**: Well-maintained, supports JWKS fetching with caching, TypeScript native
**Alternatives considered**:
- `jsonwebtoken` - Popular but no built-in JWKS support
- `jwt-decode` - Decode only, no verification

### 3. SDK Package Organization

**Decision**: Monorepo with `/packages/react` and `/packages/server` structure
**Rationale**: Shared tooling, coordinated releases, single CI/CD pipeline
**Alternatives considered**:
- Separate repositories - Harder to maintain version sync
- Single package with conditional exports - Tree-shaking issues

### 4. NPM Publishing Strategy

**Decision**: Use changesets for versioning + GitHub Actions for publishing
**Rationale**: Industry standard for monorepos (used by Radix, Chakra, etc.)
**Alternatives considered**:
- Manual versioning - Error-prone, blocks releases
- Lerna - Legacy, changesets is more modern

### 5. JWKS Caching in Server SDK

**Decision**: 24-hour cache with background refresh (per clarification)
**Rationale**: Balances security with performance; follows Auth0/Firebase patterns
**Implementation**: Use `jose`'s `createRemoteJWKSet` with custom cache options

### 6. Example Application Framework

**Decision**: Next.js 14+ App Router
**Rationale**: Has client and server in one project; most popular React framework; demonstrates real-world usage
**Alternatives considered**:
- Vite + Express - More setup, less realistic example
- Remix - Less market share than Next.js

### 7. Server SDK Authentication (ADDED 2026-01-19)

**Decision**: Require `clientId` + `clientSecret` for SDK initialization
**Rationale**: Without secret authentication, anyone knowing a project's `clientId` could verify tokens and access user data. The `clientSecret` is validated against bcrypt hash in Permit API.
**Security flow**:
1. SDK sends `clientId` + `clientSecret` when fetching JWKS
2. API validates credentials via bcrypt comparison
3. Only authenticated requests receive JWKS keys
**Prefixes**:
- `pk_...` = clientId (public, safe to expose)
- `sk_...` = clientSecret (secret, server-side only)

## Infrastructure Findings

### Existing JWT Implementation (api/internal/crypto/)

- **Algorithm**: RS256 (asymmetric)
- **Access Token TTL**: 1 hour
- **Refresh Token TTL**: 7 days
- **Claims structure**:
  ```json
  {
    "email": "user@example.com",
    "uid": "user-id",
    "pid": "project-id",
    "provider": "email|google",
    "iss": "permit",
    "sub": "user-id",
    "aud": ["project-id"],
    "exp": ...,
    "iat": ...,
    "jti": "unique-id"
  }
  ```

### JWKS Implementation Status

- ✅ `JWKSResponse` struct exists (`keys.go:36`)
- ✅ `GetJWKS()` method implemented (`keys.go:130`)
- ❌ No HTTP route exposes the JWKS endpoint
- **Action needed**: Add `/.well-known/jwks.json` route

### Current SDK Tests

- `PermitModal.test.tsx` - UI component tests
- `PermitProvider.test.tsx` - Context provider tests
- `usePermit.test.tsx` - Hook tests

### Current API Tests

- `auth_service_test.go` - Auth service unit tests

## Dependencies to Add

### Server SDK (`@permitdev/server`)

```json
{
  "dependencies": {
    "jose": "^5.x"
  }
}
```

### GitHub Actions

- `changesets/action` - For version management
- `npm publish` - Built-in Node.js
