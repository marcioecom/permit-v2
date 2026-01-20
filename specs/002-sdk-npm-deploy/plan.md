# Implementation Plan: SDK Full Stack - Client, Server & NPM Deploy

**Branch**: `002-sdk-npm-deploy` | **Date**: 2026-01-18 | **Spec**: [spec.md](file:///Users/marciojunior/code/marcioecom/permit-v2/specs/002-sdk-npm-deploy/spec.md)
**Input**: Feature specification from `/specs/002-sdk-npm-deploy/spec.md`

## Summary

Reorganize SDK codebase into a monorepo with separate client (`@permitdev/react`) and server (`@permitdev/server`) packages. Add **authenticated** JWKS endpoint to API (requires clientId+clientSecret), create server SDK for JWT validation with API key security, set up GitHub Actions for automated NPM publishing, build Next.js example app, and add comprehensive tests.

> ⚠️ **Security Update (2026-01-19)**: Server SDK now requires `clientSecret` to authenticate with Permit API before fetching JWKS keys. This prevents unauthorized access to user data.

## Technical Context

**Language/Version**: TypeScript 5.x (SDK), Go 1.24 (API)
**Primary Dependencies**: React 18, jose (JWT), vitest, changesets
**Storage**: N/A (SDK is stateless)
**Testing**: vitest (SDK), go test (API)
**Target Platform**: Node.js 18+, Browser (React)
**Project Type**: Monorepo with multiple packages
**Performance Goals**: Token validation <50ms with cached keys
**Constraints**: 24h JWKS cache with background refresh
**Scale/Scope**: 2 SDK packages, 1 example app, 2 GitHub Actions

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check |
|-----------|-------|
| I. Code Quality | ✅ KISS: jose library handles JWKS complexity; no custom crypto |
| II. Domain-Driven Simplicity | ✅ Clear separation: react=UI, server=validation |
| III. Testing Standards | ✅ Behavior tests for token validation; AAA structure |
| IV. User Experience Consistency | ✅ Unified error codes across SDK |
| V. Performance Requirements | ✅ Fail-fast validation; 24h JWKS cache |

## Project Structure

### Documentation (this feature)

```text
specs/002-sdk-npm-deploy/
├── plan.md              # This file
├── research.md          # Phase 0 output ✅
├── data-model.md        # Phase 1 output ✅
├── quickstart.md        # Phase 1 output ✅
├── contracts/           # Phase 1 output ✅
│   └── server-sdk.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Current structure (sdk/ folder)
sdk/                     → Will be moved to packages/react/

# New structure (after reorganization)
packages/
├── react/               # @permitdev/react (moved from sdk/)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── server/              # @permitdev/server (NEW)
    ├── src/
    │   ├── index.ts
    │   ├── verify.ts
    │   ├── middleware/
    │   │   └── express.ts
    │   └── next/
    │       └── index.ts
    ├── package.json
    └── tsup.config.ts

examples/
└── nextjs/              # NEW: Next.js example app
    ├── app/
    ├── package.json
    └── README.md

.github/workflows/
├── sdk-test.yml         # NEW: Test on PR
└── sdk-publish.yml      # NEW: Publish on release

.changeset/              # NEW: Changesets config
└── config.json
```

**Structure Decision**: Monorepo with `/packages/` convention (industry standard for multi-package TypeScript projects).

---

## Proposed Changes

### API Backend (Go)

#### [NEW] [jwks.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/jwks.go)

New handler to expose authenticated JWKS endpoint at `/.well-known/jwks.json`:
- Requires `Authorization: Basic {base64(clientId:clientSecret)}` header
- Validates credentials against `project_api_keys` table (bcrypt hash)
- Returns JWKS only for authenticated requests

#### [MODIFY] [routes.go](file:///Users/marciojunior/code/marcioecom/permit-v2/api/internal/handler/routes.go)

Add route: `r.Get("/.well-known/jwks.json", h.JWKS.GetJWKS)`

#### [NEW] api/internal/repository/project_repo.go

Add method to validate API key credentials:
```go
func (r *postgresProjectRepo) ValidateAPIKey(ctx context.Context, clientId, clientSecret string) (*models.APIKey, error)
```

---

### SDK Packages

#### [NEW] packages/server/

New server SDK package structure:
- `src/index.ts` - Main exports (PermitAuth class)
- `src/verify.ts` - Token verification logic using `jose`
- `src/auth.ts` - JWKS fetching with Basic Auth (clientId:clientSecret)
- `src/middleware/express.ts` - Express middleware
- `src/next/index.ts` - Next.js App Router helpers
- `package.json` - Package config with name `@permitdev/server`

**SDK initialization requires both `clientId` and `clientSecret` to authenticate with Permit API.**

#### [MODIFY] sdk/ → packages/react/

Move existing SDK folder to `packages/react/`:
- Update `package.json` name from `@permit/react` to `@permitdev/react`
- Keep all existing code intact

---

### GitHub Actions

#### [NEW] .github/workflows/sdk-test.yml

Run tests on all PRs affecting `/packages/**`:
- Install dependencies with pnpm
- Run `pnpm test:run` for all packages
- Block merge on failure

#### [NEW] .github/workflows/sdk-publish.yml

Publish packages on version tag:
- Trigger on `v*` tags
- Run changesets publish
- Requires NPM_TOKEN secret

---

### Changesets Configuration

#### [NEW] .changeset/config.json

Changesets configuration for version management:
- `access: "public"` for scoped packages
- `baseBranch: "main"`
- `updateInternalDependencies: "patch"`

---

### Example Application

#### [NEW] examples/nextjs/

Next.js 14+ example demonstrating full auth flow:
- Client: `PermitProvider`, `PermitModal`, `usePermit`
- Server: `withPermitAuth` middleware in API routes
- Protected data fetch example

---

### Additional Tests

#### [NEW] packages/server/src/__tests__/verify.test.ts

Unit tests for token verification:
- Valid token verification
- Expired token rejection
- Invalid signature handling
- JWKS caching behavior

#### [NEW] api/internal/handler/jwks_test.go

Integration test for JWKS endpoint:
- Returns 401 for unauthenticated requests
- Returns 401 for invalid credentials
- Returns valid JWKS format for authenticated requests
- Contains expected key properties

---

## Verification Plan

### Automated Tests

| Test | Command | Description |
|------|---------|-------------|
| SDK React Tests | `pnpm --filter @permitdev/react test:run` | Existing tests (3 files) |
| SDK Server Tests | `pnpm --filter @permitdev/server test:run` | New verification tests |
| API Tests | `cd api && go test ./...` | Existing + new JWKS test |

### Manual Verification

1. **JWKS Endpoint (unauthenticated)**: `curl http://localhost:8080/.well-known/jwks.json` should return `401 Unauthorized`

2. **JWKS Endpoint (authenticated)**:
   ```bash
   curl -u "pk_xxx:sk_xxx" http://localhost:8080/.well-known/jwks.json
   ```
   should return `{"keys":[{...}]}`

2. **Server SDK Verification**: Run example Next.js app, complete OTP login, access protected route

3. **NPM Publishing (staging)**: Run `pnpm publish --dry-run` to verify package structure

> [!NOTE]
> Full E2E verification of NPM publishing requires setting up `@permitdev` organization on npm and configuring `NPM_TOKEN` secret in GitHub repository settings. This is a one-time manual setup.

---

## Complexity Tracking

No constitution violations. All patterns follow KISS and established conventions.
