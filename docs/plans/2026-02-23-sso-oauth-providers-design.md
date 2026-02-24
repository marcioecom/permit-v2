# SSO OAuth Providers - Design Document

Date: 2026-02-23

## Overview

Add OAuth social login (Google, GitHub) as configurable authentication providers, with per-environment configuration and shared dev credentials - similar to Clerk's model.

## Goals

- Developers can enable Google and/or GitHub as sign-in options for their projects
- Each project has multiple environments (Development, Staging, Production) with isolated users and configs
- Development environments use Permit's shared OAuth credentials (zero-config)
- Production environments require the developer's own OAuth credentials
- The React SDK shows OAuth buttons in the existing PermitModal
- A callback component handles the OAuth redirect flow
- Works with any frontend framework (Next.js, React SPA, Vue, etc.)

## Data Model

### Environments

New table - sub-resource of Project:

```sql
CREATE TABLE environments (
    id          VARCHAR(26) PRIMARY KEY,  -- ULID
    project_id  VARCHAR(26) NOT NULL REFERENCES projects(id),
    name        VARCHAR(100) NOT NULL,     -- "Development", "Staging", "Production"
    type        VARCHAR(20) NOT NULL,      -- "development", "staging", "production"
    allowed_origins TEXT[] DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, type)
);
```

Every project gets a "development" environment on creation. Users can add staging/production.

### OAuth Provider Configs

Per-environment provider configuration:

```sql
CREATE TABLE oauth_provider_configs (
    id              VARCHAR(26) PRIMARY KEY,  -- ULID
    environment_id  VARCHAR(26) NOT NULL REFERENCES environments(id),
    provider        VARCHAR(50) NOT NULL,      -- "google", "github"
    enabled         BOOLEAN NOT NULL DEFAULT false,
    client_id       VARCHAR(500),              -- null = use Permit shared creds
    client_secret   VARCHAR(500),              -- encrypted at rest, null = shared
    scopes          TEXT[] NOT NULL,            -- default per provider
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(environment_id, provider)
);
```

Logic:
- type="development": if client_id is null, use Permit's shared credentials
- type="production": client_id and client_secret are required to enable the provider

### OAuth State

Temporary state for CSRF protection during OAuth flow:

```sql
CREATE TABLE oauth_states (
    id              VARCHAR(26) PRIMARY KEY,
    environment_id  VARCHAR(26) NOT NULL REFERENCES environments(id),
    provider        VARCHAR(50) NOT NULL,
    state           VARCHAR(255) NOT NULL UNIQUE,
    redirect_url    VARCHAR(2000) NOT NULL,  -- client's callback URL
    client_origin   VARCHAR(2000) NOT NULL,  -- client app origin
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Auto-cleanup expired states via background job or on-read
CREATE INDEX idx_oauth_states_state ON oauth_states(state);
CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);
```

### OAuth Authorization Codes

Temporary codes issued by Permit backend after successful OAuth, exchanged by client SDK for JWT tokens:

```sql
CREATE TABLE oauth_authorization_codes (
    id              VARCHAR(26) PRIMARY KEY,
    environment_id  VARCHAR(26) NOT NULL REFERENCES environments(id),
    user_id         VARCHAR(26) NOT NULL REFERENCES users(id),
    code            VARCHAR(255) NOT NULL UNIQUE,
    provider        VARCHAR(50) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,     -- short-lived: 60 seconds
    used_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_oauth_auth_codes_code ON oauth_authorization_codes(code);
```

### Migration of Existing Tables

Tables that move from project-scoped to environment-scoped:

- `project_users` -> add `environment_id`, drop `project_id`
- `identities` -> add `environment_id`
- `refresh_tokens` -> replace `project_id` with `environment_id`
- `otp_codes` -> replace `project_id` with `environment_id`
- `auth_logs` -> replace `project_id` with `environment_id`
- `project_api_keys` -> replace `project_id` with `environment_id`
- `widgets` -> replace `project_id` with `environment_id`

The `users` table remains global. A user (email) can exist in multiple environments with independent state.

Migration strategy: existing projects get a "development" environment, and all existing data is re-pointed to that environment.

## OAuth Flow - Complete Redirect Chain

```
1. User clicks "Sign in with Google" in PermitModal
   |
2. SDK calls: POST /api/v1/auth/oauth/authorize
   Body: { provider: "google", environmentId, redirectUrl: "/sso-callback" }
   |
3. Backend:
   - Looks up oauth_provider_configs for this environment + provider
   - Determines credentials (shared or custom)
   - Generates cryptographic state param
   - Saves oauth_states row: { state, environmentId, provider, redirectUrl, clientOrigin }
   - Builds authorization URL with: client_id, redirect_uri (Permit backend), scope, state
   - Returns: { authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?..." }
   |
4. SDK redirects browser to authorizationUrl (window.location.href)
   |
5. User authenticates with Google/GitHub, grants consent
   |
6. Provider redirects to: https://api.permit.dev/oauth/callback?code=PROVIDER_CODE&state=STATE
   (redirect_uri registered with Google/GitHub points to Permit backend)
   |
7. Backend /oauth/callback handler:
   - Validates state param against oauth_states table
   - Exchanges provider code for access_token (server-to-server)
   - Fetches user profile from provider (email, name, avatar_url)
   - Creates user if new (users table)
   - Creates/updates identity (identities table, provider-specific)
   - Upserts project_users record for the environment
   - Logs auth event (auth_logs)
   - Generates a short-lived authorization_code (60s) for Permit
   - Saves to oauth_authorization_codes table
   - Redirects browser to: {clientOrigin}{redirectUrl}?code=PERMIT_CODE
   |
8. Client app's /sso-callback route renders <PermitSSOCallback />
   |
9. PermitSSOCallback component:
   - Extracts code from URL params
   - Calls: POST /api/v1/auth/oauth/token
     Body: { code: "PERMIT_CODE", environmentId }
   - Receives: { accessToken, refreshToken, user }
   - Stores tokens in localStorage (same as OTP flow)
   - Redirects to final destination (e.g., "/dashboard")
```

### Why the callback goes through Permit backend (not direct to client)?

- client_secret from Google/GitHub never touches the frontend
- Token exchange (code -> access_token) is server-to-server
- Backend controls all user creation/identity logic
- Client only receives Permit's own authorization code, not Google's

### Security considerations

- State param prevents CSRF attacks
- Authorization codes are single-use and expire in 60 seconds
- Provider access tokens are never stored long-term (used once for profile fetch)
- All redirect URLs validated against environment's allowed_origins

## Backend API Endpoints

### New endpoints

```
POST /api/v1/auth/oauth/authorize
  Body: { provider, environmentId, redirectUrl }
  Response: { authorizationUrl }

GET  /oauth/callback
  Query: code, state
  (Internal - receives redirect from Google/GitHub)
  Redirects to client app with Permit authorization code

POST /api/v1/auth/oauth/token
  Body: { code, environmentId }
  Response: { accessToken, refreshToken, user }
```

### Modified endpoints

All existing auth endpoints change from `projectId` to `environmentId`:

```
POST /api/v1/auth/otp/start      -> uses environmentId
POST /api/v1/auth/otp/verify     -> uses environmentId
POST /api/v1/auth/refresh         -> environment derived from token
GET  /api/v1/auth/me              -> environment derived from token
```

### New dashboard endpoints

```
# Environments
POST   /api/v1/dashboard/projects/{id}/environments
GET    /api/v1/dashboard/projects/{id}/environments
GET    /api/v1/dashboard/projects/{id}/environments/{envId}
PATCH  /api/v1/dashboard/projects/{id}/environments/{envId}

# OAuth Provider Configs
GET    /api/v1/dashboard/projects/{id}/environments/{envId}/oauth-providers
POST   /api/v1/dashboard/projects/{id}/environments/{envId}/oauth-providers
PATCH  /api/v1/dashboard/projects/{id}/environments/{envId}/oauth-providers/{provider}
DELETE /api/v1/dashboard/projects/{id}/environments/{envId}/oauth-providers/{provider}
```

## JWT Token Changes

The JWT claims add environment context:

```json
{
  "iss": "permit",
  "sub": "user_id",
  "aud": ["environment_id"],
  "uid": "user_id",
  "email": "user@example.com",
  "pid": "project_id",
  "eid": "environment_id",
  "provider": "google",
  "iat": 1234567890,
  "exp": 1234568790
}
```

The `aud` claim changes from projectId to environmentId. The `eid` claim is added. Server SDK verification uses `eid` for audience validation.

## Shared Dev Credentials

Permit registers OAuth apps with Google and GitHub:

- **Google OAuth App**: redirect_uri = `https://api.permit.dev/oauth/callback`
- **GitHub OAuth App**: redirect_uri = `https://api.permit.dev/oauth/callback`

Stored as server config (env vars or config file), not in the database:

```
PERMIT_SHARED_GOOGLE_CLIENT_ID=xxx
PERMIT_SHARED_GOOGLE_CLIENT_SECRET=xxx
PERMIT_SHARED_GITHUB_CLIENT_ID=xxx
PERMIT_SHARED_GITHUB_CLIENT_SECRET=xxx
```

When resolving credentials for a provider:
1. If oauth_provider_configs has client_id set -> use custom credentials
2. If environment type is "development" and no custom credentials -> use shared
3. If environment type is "production"/"staging" and no custom credentials -> error, provider cannot be enabled

In dev mode, the Google consent screen shows "Permit Dev" instead of the developer's app name. This is expected behavior.

## React SDK Changes

### PermitProvider - new props

```tsx
<PermitProvider
  environmentId="env_xxx"      // replaces projectId
  ssoCallbackUrl="/sso-callback"  // where to redirect after OAuth
>
```

Backwards compat: `projectId` prop continues working for projects without environments (resolves to default dev environment on backend).

### PermitModal - OAuth buttons

The modal fetches widget config which includes `enabled_providers`. If Google/GitHub are enabled:

```
+----------------------------------+
|         Sign in to App           |
|                                  |
|  [G] Continue with Google        |
|  [GH] Continue with GitHub       |
|                                  |
|  --------- or ----------         |
|                                  |
|  Email: [________________]       |
|  [Send code]                     |
+----------------------------------+
```

Clicking an OAuth button:
1. Calls POST /api/v1/auth/oauth/authorize
2. Receives authorizationUrl
3. Redirects: window.location.href = authorizationUrl

### PermitSSOCallback - new component

```tsx
import { PermitSSOCallback } from '@permitdev/react';

// In your /sso-callback route:
export default function SSOCallbackPage() {
  return <PermitSSOCallback afterSignInUrl="/dashboard" />;
}
```

Internally:
1. On mount, extracts `code` from URL search params
2. Calls POST /api/v1/auth/oauth/token
3. Stores tokens via existing credential management
4. Redirects to afterSignInUrl

### Vanilla JS support

For non-React frameworks, export functions from the core SDK:

```typescript
import { handleSSOCallback } from '@permitdev/react/core';

// In callback route handler:
const result = await handleSSOCallback({ environmentId: 'env_xxx' });
// result: { user, accessToken, refreshToken }
```

## Server SDK Changes

- `PermitAuth` config: accept `environmentId` alongside (or instead of) `clientId`
- JWT verification: validate `eid` claim in addition to existing checks
- Backwards compatible: existing clientId/clientSecret flow still works

## Dashboard Changes

### Environment management

- Project detail page shows environments list
- Create environment form: name + type (development/staging/production)
- Each environment has its own settings page

### OAuth provider configuration

Per-environment settings page:

- Toggle providers on/off
- In dev: shows "Using Permit test credentials" badge
- In prod: shows form for client_id + client_secret with setup instructions
- Link to Google/GitHub OAuth app setup guides

### Existing pages

- Users list: scoped by environment
- Auth logs: scoped by environment
- API keys: scoped by environment
- Stats: scoped by environment with aggregate view at project level

## Provider-Specific Details

### Google OAuth 2.0

- Authorization URL: `https://accounts.google.com/o/oauth2/v2/auth`
- Token URL: `https://oauth2.googleapis.com/token`
- User info URL: `https://www.googleapis.com/oauth2/v2/userinfo`
- Default scopes: `openid email profile`
- Returns: email, name, picture, sub (Google user ID)

### GitHub OAuth

- Authorization URL: `https://github.com/login/oauth/authorize`
- Token URL: `https://github.com/login/oauth/access_token`
- User info URL: `https://api.github.com/user`
- Email URL: `https://api.github.com/user/emails` (for private emails)
- Default scopes: `user:email read:user`
- Returns: login, email, name, avatar_url, id (GitHub user ID)

## Migration Plan

### Database migration

1. Create `environments` table
2. For each existing project, create a "development" environment
3. Add `environment_id` column to: project_users, identities, refresh_tokens, otp_codes, auth_logs, project_api_keys, widgets
4. Populate environment_id from project's default environment
5. Create remaining new tables: oauth_provider_configs, oauth_states, oauth_authorization_codes
6. Drop project_id foreign keys from migrated tables (after backfill)

### API compatibility

- Old endpoints with projectId continue working (resolve to default environment)
- New endpoints use environmentId
- Gradual migration path for existing SDK users

## Multi-Framework Callback Routes

| Framework | Callback route | Implementation |
|-----------|---------------|----------------|
| Next.js App Router | `app/sso-callback/page.tsx` | `<PermitSSOCallback />` |
| Next.js Pages Router | `pages/sso-callback.tsx` | `<PermitSSOCallback />` |
| React Router / Vite | Route component | `<PermitSSOCallback />` |
| Vue / Svelte / Other | Any route | `handleSSOCallback()` vanilla JS function |

## Out of Scope (Future)

- Additional providers (Apple, Microsoft, Discord, etc.)
- SAML/enterprise SSO
- Account linking (connect Google to existing email account)
- Custom OAuth scopes per project
- Webhooks for auth events
