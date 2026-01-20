# Tasks: SDK Full Stack - Client, Server & NPM Deploy

**Input**: Design documents from `/specs/002-sdk-npm-deploy/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Included as requested in spec (FR-007: "System MUST have automated tests")

**Organization**: Tasks grouped by user story for independent implementation

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in descriptions

## Path Conventions

- **API**: `api/internal/` (Go backend)
- **SDK Packages**: `packages/react/`, `packages/server/` (TypeScript)
- **Examples**: `examples/nextjs/`
- **CI/CD**: `.github/workflows/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project reorganization and monorepo structure

- [x] T001 Create `packages/` directory structure at repo root
- [x] T002 Move `sdk/` folder to `packages/react/`
- [x] T003 [P] Update `packages/react/package.json` name from `@permit/react` to `@permitdev/react`
- [x] T004 [P] Create `.changeset/config.json` with changesets configuration
- [x] T005 [P] Update root `pnpm-workspace.yaml` to include `packages/*` and `examples/*`
- [x] T006 Update root `package.json` with workspace scripts (`dev:sdk`, `test:sdk`, `build:sdk`)

---

## Phase 2: Foundational (API - JWKS Endpoint)

**Purpose**: Authenticated JWKS endpoint that server SDK depends on

**⚠️ CRITICAL**: US1 (Server SDK) cannot function without this endpoint

- [x] T007 Add `GetAPIKeyByClientID(ctx, clientId string)` method in `api/internal/repository/project_repo.go`
- [x] T008 Create `api/internal/handler/jwks.go` with `JWKSHandler` struct
- [x] T009 Implement Basic Auth parsing and validation in `api/internal/handler/jwks.go`
- [x] T010 Implement `GetJWKS` handler that returns JWKS after auth in `api/internal/handler/jwks.go`
- [x] T011 Add JWKS route `/.well-known/jwks.json` in `api/internal/handler/routes.go`
- [x] T012 [P] Create test `api/internal/handler/jwks_test.go` for JWKS endpoint

**Checkpoint**: JWKS endpoint functional - `curl -u "pk_xxx:sk_xxx" localhost:8080/.well-known/jwks.json` returns keys

---

## Phase 3: User Story 1 - Developer Integrates Server SDK (Priority: P1) 🎯 MVP

**Goal**: Server SDK that validates JWT tokens using authenticated JWKS endpoint

**Independent Test**: Create test file that verifies a token and returns user data

### Tests for User Story 1

- [x] T013 [P] [US1] Create test file `packages/server/src/__tests__/verify.test.ts` with test structure
- [x] T014 [P] [US1] Write test: should verify valid token in `packages/server/src/__tests__/verify.test.ts`
- [x] T015 [P] [US1] Write test: should reject expired token in `packages/server/src/__tests__/verify.test.ts`
- [x] T016 [P] [US1] Write test: should reject invalid signature in `packages/server/src/__tests__/verify.test.ts`
- [x] T017 [P] [US1] Write test: should return INVALID_CREDENTIALS for bad secret in `packages/server/src/__tests__/verify.test.ts`

### Implementation for User Story 1

- [x] T018 [US1] Create `packages/server/package.json` with `@permitdev/server` config and `jose` dependency
- [x] T019 [P] [US1] Create `packages/server/tsconfig.json` extending base config
- [x] T020 [P] [US1] Create `packages/server/tsup.config.ts` for bundling with ESM+CJS output
- [x] T021 [US1] Create `packages/server/src/types.ts` with PermitConfig, PermitUser, VerificationResult, ErrorCode types
- [x] T022 [US1] Create `packages/server/src/auth.ts` with JWKS fetching using Basic Auth (clientId:clientSecret)
- [x] T023 [US1] Create `packages/server/src/verify.ts` with token verification logic using jose
- [x] T024 [US1] Create `packages/server/src/index.ts` exporting PermitAuth class and types
- [x] T025 [US1] Create `packages/server/src/middleware/express.ts` with createPermitMiddleware
- [x] T026 [US1] Create `packages/server/src/next/index.ts` with withPermitAuth helper
- [x] T027 [US1] Create `packages/server/vitest.config.ts` for test runner
- [x] T028 [US1] Run tests and verify all pass: `pnpm --filter @permitdev/server test:run`

**Checkpoint**: Server SDK functional - can verify tokens with `PermitAuth.verifyToken()`

---

## Phase 4: User Story 2 - SDK Published on NPM (Priority: P1)

**Goal**: Automated NPM publishing via GitHub Actions with changesets

**Independent Test**: Run `pnpm publish --dry-run` and verify package structure

### Implementation for User Story 2

- [x] T029 [P] [US2] Create `.github/workflows/sdk-test.yml` for PR testing
- [x] T030 [P] [US2] Create `.github/workflows/sdk-publish.yml` for NPM publishing on tags
- [x] T031 [US2] Update `packages/react/package.json` repository and publishConfig
- [x] T032 [US2] Update `packages/server/package.json` repository and publishConfig
- [x] T033 [US2] Create `packages/react/README.md` with installation and usage docs
- [x] T034 [US2] Create `packages/server/README.md` with installation and usage docs
- [ ] T035 [US2] Verify publish dry-run: `pnpm publish --dry-run -r`

**Checkpoint**: CI/CD configured - PRs trigger tests, tags publish to NPM

---

## Phase 5: User Story 3 - Developer Uses Example App (Priority: P2)

**Goal**: Next.js example demonstrating full auth flow

**Independent Test**: Run example locally, complete OTP login, access protected route

### Implementation for User Story 3

- [x] T036 [US3] Create `examples/nextjs/` directory structure with Next.js 14+
- [x] T037 [US3] Create `examples/nextjs/package.json` with local SDK dependencies
- [x] T038 [P] [US3] Create `examples/nextjs/.env.example` with PERMIT_CLIENT_ID/SECRET placeholders
- [x] T039 [US3] Create `examples/nextjs/app/layout.tsx` with PermitProvider setup
- [x] T040 [US3] Create `examples/nextjs/app/page.tsx` with login UI using PermitModal
- [x] T041 [US3] Create `examples/nextjs/app/api/protected/route.ts` with withPermitAuth middleware
- [x] T042 [US3] Create `examples/nextjs/README.md` with setup instructions
- [ ] T043 [US3] Test example: run locally and complete full auth flow

**Checkpoint**: Example app works end-to-end with local SDK packages

---

## Phase 6: User Story 4 - Automated Tests Ensure Quality (Priority: P2)

**Goal**: Comprehensive test coverage for OTP flow, token generation, token validation

**Independent Test**: Run full test suite - all tests pass, CI blocks on failure

### Tests for API

- [ ] T044 [P] [US4] Add test: OTP start request in `api/internal/service/auth_service_test.go`
- [ ] T045 [P] [US4] Add test: OTP verify with valid code in `api/internal/service/auth_service_test.go`
- [ ] T046 [P] [US4] Add test: OTP verify with expired code in `api/internal/service/auth_service_test.go`
- [ ] T047 [P] [US4] Add test: token refresh flow in `api/internal/service/session_service_test.go`

### Tests for Client SDK

- [ ] T048 [P] [US4] Add test: token refresh before expiry in `packages/react/src/__tests__/PermitProvider.test.tsx`
- [ ] T049 [P] [US4] Add test: logout clears tokens in `packages/react/src/__tests__/PermitProvider.test.tsx`

### Test Runner Integration

- [ ] T050 [US4] Verify all API tests pass: `cd api && go test ./...`
- [ ] T051 [US4] Verify all SDK tests pass: `pnpm test:sdk`
- [ ] T052 [US4] Verify CI workflow runs tests correctly on PR

**Checkpoint**: 80%+ coverage on critical auth paths, CI enforces quality

---

## Phase 7: Polish & Documentation

**Purpose**: Final cleanup and documentation

- [ ] T053 [P] Update root `README.md` with SDK package links and quickstart
- [ ] T054 [P] Create `CONTRIBUTING.md` with development workflow using changesets
- [ ] T055 Run quickstart.md validation: follow steps and verify they work
- [ ] T056 Clean up any TODO comments in codebase

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────────────────────┐
                                         │
Phase 2 (Foundational/JWKS) ─────────────┤ ← BLOCKING
                                         │
         ┌───────────────────────────────┴───────────────────────────────┐
         │                               │                               │
         ▼                               ▼                               ▼
Phase 3 (US1: Server SDK)        Phase 4 (US2: NPM Publish)    Phase 5 (US3: Example)
         │                               │                               │
         └───────────────────────────────┴───────────────────────────────┘
                                         │
                                         ▼
                            Phase 6 (US4: All Tests)
                                         │
                                         ▼
                            Phase 7 (Polish)
```

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 (Server SDK) | Phase 2 (JWKS) | US2 (partial) |
| US2 (NPM Publish) | Phase 1 (Setup) | US1 (after T018) |
| US3 (Example) | US1 complete | US4 |
| US4 (Tests) | US1, US2 complete | US3 |

### Within Each User Story

1. Tests FIRST → verify they FAIL
2. Infrastructure/Config → package.json, tsconfig
3. Types → src/types.ts
4. Core implementation → auth.ts, verify.ts
5. Exports → index.ts
6. Integrations → middleware, next helpers
7. Verify tests PASS

---

## Parallel Example: User Story 1 (Server SDK)

```bash
# Launch all tests together (T013-T017):
Task: "Create test file packages/server/src/__tests__/verify.test.ts"
Task: "Write test: should verify valid token"
Task: "Write test: should reject expired token"
Task: "Write test: should reject invalid signature"
Task: "Write test: should return INVALID_CREDENTIALS"

# Launch parallel config tasks (T019-T020):
Task: "Create packages/server/tsconfig.json"
Task: "Create packages/server/tsup.config.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. ✅ Complete Phase 1: Setup
2. ✅ Complete Phase 2: Foundational (JWKS endpoint)
3. ✅ Complete Phase 3: User Story 1 (Server SDK)
4. **STOP and VALIDATE**: Test with `pnpm --filter @permitdev/server test:run`
5. Deploy/demo if ready - Server SDK is usable!

### Incremental Delivery

1. Setup + Foundational → Infrastructure ready
2. Add US1 (Server SDK) → Test independently → **MVP Ready!**
3. Add US2 (NPM Publish) → Packages on npm
4. Add US3 (Example) → Developer reference app
5. Add US4 (Tests) → Full quality coverage
6. Polish → Ready for production

---

## Notes

- All SDK work uses TypeScript 5.x with jose for JWT handling
- API work uses Go 1.24 with existing chi router
- JWKS endpoint requires Basic Auth with clientId:clientSecret
- Tests use vitest (SDK) and go test (API)
- NPM publishing uses changesets for versioning
