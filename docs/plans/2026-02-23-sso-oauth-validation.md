# SSO OAuth Providers - Validation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure GitHub and Google OAuth apps with correct URIs and validate the full SSO flow end-to-end in the development environment.

**Architecture:** The Go API (`localhost:8080`) acts as the OAuth callback receiver. When a user clicks "Sign in with Google/GitHub", the API redirects them to the provider. After auth, the provider redirects back to `{OAUTH_CALLBACK_BASE_URL}/oauth/callback`. The API then exchanges the code for tokens, creates/finds the user, and redirects them back to the client app (example Next.js on `localhost:3000`) at `/sso-callback?code=...`.

**Tech Stack:** Go API, Next.js example app, GitHub OAuth App, Google OAuth App

---

## Understanding the Flow

```
Client (localhost:3000)          API (localhost:8080)              Provider (Google/GitHub)
        |                              |                                   |
        |-- POST /auth/oauth/authorize |                                   |
        |       {provider, envId}      |                                   |
        |<--- authorizationUrl --------|                                   |
        |                              |                                   |
        |--- redirect to provider -----|---------------------------------->|
        |                              |                                   |
        |                              |<-- GET /oauth/callback?code&state |
        |                              |                                   |
        |<-- redirect to client -------|                                   |
        |    /sso-callback?code=xxx    |                                   |
        |                              |                                   |
        |-- POST /auth/oauth/token ----|                                   |
        |       {code, envId}          |                                   |
        |<--- accessToken, user -------|                                   |
```

Key URL: The **API callback URL** is `http://localhost:8080/oauth/callback` (configured via `OAUTH_CALLBACK_BASE_URL` env var).

---

### Task 1: Configure GitHub OAuth App

**No code changes required - GitHub OAuth console configuration only.**

**Step 1: Go to GitHub Developer Settings**

Navigate to: https://github.com/settings/developers (or your org's settings)

Click "New OAuth App" (or edit the existing one used for shared credentials).

**Step 2: Set the following values**

- **Application name:** `Permit (Development)`
- **Homepage URL:** `http://localhost:3000`
- **Authorization callback URL:** `http://localhost:8080/oauth/callback`

The callback URL MUST match exactly what the API sends as `redirect_uri`. The API constructs it as:
```
s.cfg.OAuthCallbackBaseURL + "/oauth/callback"
```
With `OAUTH_CALLBACK_BASE_URL=http://localhost:8080`, this becomes `http://localhost:8080/oauth/callback`.

**Step 3: Save and copy Client ID and Client Secret**

Set them in the worktree's `.env`:
```
PERMIT_SHARED_GITHUB_CLIENT_ID=<client_id>
PERMIT_SHARED_GITHUB_CLIENT_SECRET=<client_secret>
```

**Step 4: Verify the env vars are set**

Run: `grep GITHUB /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api/.env`

Expected: Both `PERMIT_SHARED_GITHUB_CLIENT_ID` and `PERMIT_SHARED_GITHUB_CLIENT_SECRET` have values.

---

### Task 2: Configure Google OAuth App

**No code changes required - Google Cloud Console configuration only.**

**Step 1: Go to Google Cloud Console**

Navigate to: https://console.cloud.google.com/apis/credentials

Select or create the OAuth 2.0 Client ID used for shared credentials.

**Step 2: Set the following values**

- **Origens JavaScript autorizadas (Authorized JavaScript origins):**
  - `http://localhost:3000` (the client app)
  - `http://localhost:8080` (the API - Google requires the origin of the redirect_uri)

- **URIs de redirecionamento autorizados (Authorized redirect URIs):**
  - `http://localhost:8080/oauth/callback`

Same logic: the API sends `redirect_uri=http://localhost:8080/oauth/callback` to Google during the auth flow.

**Step 3: Save and copy Client ID and Client Secret**

Set them in the worktree's `.env`:
```
PERMIT_SHARED_GOOGLE_CLIENT_ID=<client_id>
PERMIT_SHARED_GOOGLE_CLIENT_SECRET=<client_secret>
```

**Step 4: Verify the env vars are set**

Run: `grep GOOGLE /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api/.env`

Expected: Both `PERMIT_SHARED_GOOGLE_CLIENT_ID` and `PERMIT_SHARED_GOOGLE_CLIENT_SECRET` have values.

---

### Task 3: Verify OAUTH_CALLBACK_BASE_URL is set

**Step 1: Check the env var**

Run: `grep OAUTH_CALLBACK_BASE_URL /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api/.env`

Expected: `OAUTH_CALLBACK_BASE_URL=http://localhost:8080`

If not set, the default in config.go is `http://localhost:8080`, so it should work. But for explicitness, add it to `.env`.

---

### Task 4: Start the services and run the example app

**Step 1: Start the API (in the worktree)**

```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api
go run cmd/server/main.go
```

Verify: API starts on port 8080, no errors about missing OAuth env vars.

**Step 2: Start the example Next.js app (in a separate terminal)**

```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/examples/nextjs
pnpm install && pnpm dev
```

Verify: App starts on port 3000.

**Step 3: Ensure database migrations have run**

The API should auto-run migrations on startup. Verify that `oauth_provider_configs`, `oauth_states`, and `oauth_authorization_codes` tables exist.

---

### Task 5: Test GitHub OAuth flow

**Step 1: Open the example app**

Navigate to `http://localhost:3000` in the browser.

**Step 2: Click the GitHub sign-in button in the Permit modal**

The app should:
1. POST to `/api/v1/auth/oauth/authorize` with `provider: "github"`
2. Receive an `authorizationUrl`
3. Redirect you to `github.com/login/oauth/authorize?client_id=...&redirect_uri=http://localhost:8080/oauth/callback&...`

**Step 3: Authenticate with GitHub**

GitHub shows "Authorize Permit (Development)" consent screen. Click authorize.

**Step 4: Verify callback flow**

GitHub redirects to `http://localhost:8080/oauth/callback?code=xxx&state=yyy`.
The API processes the callback and redirects to `http://localhost:3000/sso-callback?code=zzz`.
The `PermitSSOCallback` component exchanges the code for tokens.

**Expected result:** User is authenticated and redirected to `/` with a valid session.

**If it fails:** Check API logs for errors. Common issues:
- `invalid_state` - state expired (>10 min) or was already used
- `token_exchange_failed` - callback URL mismatch between authorize and token exchange
- CORS error - check that `allowed_origins` includes `http://localhost:3000` for the environment

---

### Task 6: Test Google OAuth flow

**Step 1: Same as Task 5 but click the Google sign-in button**

**Step 2: Authenticate with Google**

Google shows consent screen saying you're signing into "Permit". Click allow.

**Step 3: Verify callback flow**

Same as GitHub - Google redirects to `http://localhost:8080/oauth/callback`, API processes it, redirects to client.

**Expected result:** User is authenticated and redirected to `/` with a valid session.

**If it fails:** Check:
- Google requires HTTPS for production but allows `localhost` for development
- The redirect URI in Google Console must match EXACTLY (no trailing slash)
- Google adds `access_type=offline&prompt=consent` params (the API already does this)

---

### Task 7: Verify the "shared credentials" fallback works

**Step 1: Confirm no environment-specific OAuth config exists**

The `oauth_provider_configs` table should be empty (no custom credentials for the dev environment).

**Step 2: Check the `resolveCredentials` logic**

The API should fall back to shared credentials from env vars when no environment-specific config is found. Verify this in logs or by checking that the flow works without adding any entries to `oauth_provider_configs`.

---

## Summary of URLs to Configure

| Provider | Setting | Value |
|----------|---------|-------|
| **GitHub** | Homepage URL | `http://localhost:3000` |
| **GitHub** | Authorization callback URL | `http://localhost:8080/oauth/callback` |
| **Google** | Authorized JavaScript origins | `http://localhost:3000`, `http://localhost:8080` |
| **Google** | Authorized redirect URIs | `http://localhost:8080/oauth/callback` |

## Production Notes

For production, the URLs will change to the actual deployed domains:
- Callback URL: `https://api.permit.dev/oauth/callback` (or whatever the production API URL is)
- JavaScript origins: the client's production domain
- Each client configures their own OAuth app credentials via the dashboard, stored in `oauth_provider_configs`
