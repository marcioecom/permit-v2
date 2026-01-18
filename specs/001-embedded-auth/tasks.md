# Tasks: Permit Embedded Authentication

**Input**: Design documents from `/specs/001-embedded-auth/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1-US5)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Project initialization and dependency installation

- [x] T001 Add Go dependencies: `go get golang.org/x/oauth2 golang.org/x/time/rate` in api/
- [x] T002 [P] Add unified response helpers in api/internal/handler/helper.go
- [x] T003 [P] Create rate limiter middleware in api/internal/handler/middleware/rate_limiter.go

**Checkpoint**: Setup complete, ready for foundational work

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create migration 002_add_identities.sql in api/internal/database/migrations/
- [x] T005 Run migration: `cd api && go run cmd/migrate/main.go`
- [x] T006 [P] Create Identity model in api/internal/models/identity.go
- [x] T007 [P] Create Identity repository in api/internal/repository/identity_repo.go
- [x] T008 Inject JWTService into AuthService in api/internal/service/auth_service.go
- [x] T009 Add Resend email sending to OTP flow in api/internal/service/auth_service.go

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 1 - Developer Project Setup (Priority: P1) 🎯 MVP

**Goal**: Developers create projects, configure settings, receive credentials

**Independent Test**: Create a project via API, verify App ID and API keys are generated

### Implementation for User Story 1

- [x] T010 [US1] Update Project model with allowed_providers field in api/internal/models/project.go
- [x] T011 [US1] Update project repository for CRUD with new fields in api/internal/repository/project_repo.go
- [x] T012 [P] [US1] Create ProjectService in api/internal/service/project_service.go
- [x] T013 [P] [US1] Create APIKey generation logic in api/internal/service/project_service.go
- [x] T014 [US1] Implement POST /projects handler in api/internal/handler/project.go
- [x] T015 [US1] Implement GET /projects/{id} handler in api/internal/handler/project.go
- [x] T016 [US1] Implement PATCH /projects/{id} handler in api/internal/handler/project.go
- [x] T017 [US1] Implement POST /projects/{id}/api-keys handler in api/internal/handler/project.go
- [x] T018 [US1] Implement GET /projects/{id}/widget handler in api/internal/handler/project.go
- [x] T019 [US1] Implement PATCH /projects/{id}/widget handler in api/internal/handler/project.go
- [x] T020 [US1] Add project routes to api/internal/handler/routes.go

**Checkpoint**: User Story 1 complete - projects can be created with credentials

---

## Phase 4: User Story 2 - Email OTP Authentication (Priority: P1) 🎯 MVP

**Goal**: End users authenticate via email OTP through the widget

**Independent Test**: Trigger OTP via API, receive email, verify code, get session tokens

### Implementation for User Story 2

- [x] T021 [US2] Add identity linking on OTP success in api/internal/service/auth_service.go
- [x] T022 [US2] Add per-project user creation logic in api/internal/service/auth_service.go
- [x] T023 [US2] Add input validation to OTP handlers in api/internal/handler/auth.go
- [x] T024 [US2] Apply rate limiter middleware to OTP endpoints in api/internal/handler/routes.go
- [x] T025 [P] [US2] Update EmailInput component for validation in sdk/src/components/EmailInput.tsx
- [x] T026 [P] [US2] Update OTPInput component for 6-digit entry in sdk/src/components/OTPInput.tsx
- [x] T027 [US2] Add error display for fail-fast behavior in sdk/src/components/PermitModal.tsx
- [x] T028 [US2] Add loading states to OTP flow in sdk/src/components/PermitModal.tsx

**Checkpoint**: User Story 2 complete - OTP auth flow fully functional

---

## Phase 5: User Story 4 - SDK Integration (Priority: P1) 🎯 MVP

**Goal**: Developers integrate SDK with App ID, widget renders auth UI

**Independent Test**: Install SDK in playground, initialize with project ID, trigger modal

### Implementation for User Story 4

- [x] T029 [US4] Add project config fetch on mount in sdk/src/lib/auth.ts
- [x] T030 [US4] Update PermitProvider to fetch project config in sdk/src/PermitProvider.tsx
- [x] T031 [US4] Apply theme config (colors, logo) to modal in sdk/src/components/PermitModal.tsx
- [x] T032 [US4] Show enabled auth methods from config in sdk/src/components/PermitModal.tsx
- [x] T033 [US4] Improve error handling for invalid App ID in sdk/src/PermitProvider.tsx
- [x] T034 [US4] Update playground to test SDK integration in playground/src/App.tsx

**Checkpoint**: User Story 4 complete - SDK fully integrable with project ID

---

## Phase 6: User Story 5 - Session Management (Priority: P2)

**Goal**: Sessions issued, tokens refreshable, user data accessible via SDK

**Independent Test**: Authenticate, call /auth/me, refresh token, logout

### Implementation for User Story 5

- [x] T035 [US5] Create SessionService in api/internal/service/session_service.go
- [x] T036 [P] [US5] Create session handler in api/internal/handler/session.go
- [x] T037 [US5] Implement GET /auth/me endpoint in api/internal/handler/auth.go
- [x] T038 [US5] Implement POST /auth/refresh endpoint in api/internal/handler/session.go
- [x] T039 [US5] Implement POST /auth/logout endpoint in api/internal/handler/session.go
- [x] T040 [US5] Add session routes to api/internal/handler/routes.go
- [x] T041 [P] [US5] Add token refresh logic in sdk/src/lib/auth.ts
- [x] T042 [P] [US5] Add logout API call in sdk/src/lib/auth.ts
- [x] T043 [US5] Add automatic token refresh in sdk/src/PermitProvider.tsx
- [x] T044 [US5] Expose user data via usePermit hook in sdk/src/hooks/usePermit.ts

**Checkpoint**: User Story 5 complete - full session lifecycle working

---

## Phase 7: User Story 3 - Social Login (Priority: P2)

**Goal**: End users authenticate via Google/GitHub OAuth

**Independent Test**: Configure OAuth provider, complete flow, verify identity linked

### Implementation for User Story 3

- [ ] T045 [US3] Create OAuth config in api/internal/config/oauth.go
- [ ] T046 [US3] Create OAuthService in api/internal/service/oauth_service.go
- [ ] T047 [US3] Create OAuth handler in api/internal/handler/oauth.go
- [ ] T048 [US3] Implement GET /auth/oauth/{provider} (initiate) in api/internal/handler/oauth.go
- [ ] T049 [US3] Implement GET /auth/oauth/{provider}/callback in api/internal/handler/oauth.go
- [ ] T050 [US3] Add identity linking for OAuth in api/internal/service/oauth_service.go
- [ ] T051 [US3] Add OAuth routes to api/internal/handler/routes.go
- [ ] T052 [P] [US3] Create SocialButton component in sdk/src/components/SocialButton.tsx
- [ ] T053 [P] [US3] Create useOAuth hook for popup flow in sdk/src/hooks/useOAuth.ts
- [ ] T054 [US3] Add social login buttons to modal in sdk/src/components/PermitModal.tsx
- [ ] T055 [US3] Handle OAuth postMessage in PermitProvider in sdk/src/PermitProvider.tsx

**Checkpoint**: User Story 3 complete - social login working

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, tests, and final cleanup

- [x] T056 [P] Update SDK README with integration examples in sdk/README.md
- [x] T057 [P] Add API documentation comments in api/internal/handler/*.go
- [x] T058 Update quickstart.md validation checklist in specs/001-embedded-auth/quickstart.md
- [x] T059 Run manual OTP flow test per quickstart.md
- [N/A] T060 Run manual social login test per quickstart.md (Social login skipped)
- [x] T061 Run SDK tests: `cd sdk && pnpm test`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - start immediately
- **Foundational (Phase 2)**: Depends on Setup - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational
- **User Story 2 (Phase 4)**: Depends on Foundational
- **User Story 4 (Phase 5)**: Depends on User Stories 1 & 2 (needs project & OTP working)
- **User Story 5 (Phase 6)**: Depends on User Story 2 (needs auth to test sessions)
- **User Story 3 (Phase 7)**: Depends on Foundational (can run parallel to others)
- **Polish (Phase 8)**: Depends on all user stories

### User Story Dependencies

```text
        ┌─────────────┐
        │   Setup     │
        └──────┬──────┘
               │
        ┌──────▼──────┐
        │ Foundational │
        └──────┬──────┘
               │
    ┌──────────┼──────────┐
    │          │          │
┌───▼───┐  ┌───▼───┐  ┌───▼───┐
│  US1  │  │  US2  │  │  US3  │ (can run in parallel)
│Project│  │  OTP  │  │ OAuth │
└───┬───┘  └───┬───┘  └───────┘
    │          │
    └────┬─────┘
         │
    ┌────▼────┐
    │   US4   │ (needs project + OTP)
    │   SDK   │
    └────┬────┘
         │
    ┌────▼────┐
    │   US5   │ (needs auth working)
    │ Session │
    └─────────┘
```

### Parallel Opportunities

```bash
# Phase 1 Parallel:
T002, T003 (different files)

# Phase 2 Parallel:
T006, T007 (model + repo, different files)

# Phase 3 (US1) Parallel:
T012, T013 (service functions)

# Phase 4 (US2) Parallel:
T025, T026 (SDK components)

# Phase 6 (US5) Parallel:
T041, T042 (SDK lib functions)

# Phase 7 (US3) Parallel:
T052, T053 (SDK components and hooks)

# Phase 8 Parallel:
T056, T057 (documentation)
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 4)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Project Setup)
4. Complete Phase 4: User Story 2 (OTP Auth)
5. Complete Phase 5: User Story 4 (SDK Integration)
6. **STOP and VALIDATE**: Test complete OTP flow end-to-end
7. Deploy/demo if ready → MVP complete!

### Full Feature

8. Complete Phase 6: User Story 5 (Session Management)
9. Complete Phase 7: User Story 3 (Social Login)
10. Complete Phase 8: Polish
11. Full feature complete

---

## Summary

| Phase | User Story | Task Count | MVP |
|-------|------------|------------|-----|
| 1 | Setup | 3 | ✓ |
| 2 | Foundational | 6 | ✓ |
| 3 | US1 - Project Setup | 11 | ✓ |
| 4 | US2 - OTP Auth | 8 | ✓ |
| 5 | US4 - SDK Integration | 6 | ✓ |
| 6 | US5 - Session Management | 10 | |
| 7 | US3 - Social Login | 11 | |
| 8 | Polish | 6 | |
| **Total** | | **61** | **34 (MVP)** |
