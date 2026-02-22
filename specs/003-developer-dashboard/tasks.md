# Tasks: Developer Dashboard

**Input**: Design documents from `/specs/003-developer-dashboard/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests will be added for critical paths (API handlers, SDK token refresh) but not exhaustive TDD since not explicitly requested.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create Next.js dashboard app at `apps/dashboard/` using `npx create-next-app@latest`
- [ ] T002 [P] Configure pnpm workspace to include `apps/dashboard` in `pnpm-workspace.yaml`
- [ ] T003 [P] Setup TailwindCSS in dashboard app at `apps/dashboard/tailwind.config.ts`
- [ ] T004 [P] Add Permit React SDK as dependency in `apps/dashboard/package.json`
- [ ] T005 Create base layout with sidebar navigation at `apps/dashboard/app/layout.tsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Migration

- [ ] T006 Create migration file `api/internal/database/migrations/003_add_project_user_auth_tracking.sql` adding `last_auth_provider` and `login_count` columns to `project_users` table
- [ ] T007 Run migration with `cd api && go run cmd/permit/main.go migrate up`

### API Foundation

- [ ] T008 [P] Create dashboard handler file at `api/internal/handler/dashboard.go` with basic structure
- [ ] T009 [P] Add dashboard routes to `api/internal/handler/routes.go` under `/dashboard` prefix
- [ ] T010 [P] Add owner verification middleware to ensure project ownership at `api/internal/handler/middleware/owner.go`

### Dashboard Foundation

- [ ] T011 Create auth context and hooks at `apps/dashboard/lib/auth.tsx` for managing dashboard auth state
- [ ] T012 [P] Create API client with axios at `apps/dashboard/lib/api.ts` for dashboard-to-API communication
- [ ] T013 [P] Create shared UI components (Button, Card, Table, Input) at `apps/dashboard/components/ui/`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Dashboard Login (Priority: P1) 🎯 MVP

**Goal**: Developer can log in to dashboard using Permit's own OTP auth (dogfooding)

**Independent Test**: Access dashboard URL, complete OTP flow, verify redirect to `/projects`

### Implementation for User Story 1

- [ ] T014 [US1] Create login page at `apps/dashboard/app/login/page.tsx` using PermitModal component
- [ ] T015 [US1] Implement auth callback handling to store tokens in `apps/dashboard/lib/auth.tsx`
- [ ] T016 [US1] Create protected route wrapper at `apps/dashboard/components/ProtectedRoute.tsx`
- [ ] T017 [US1] Add root page redirect logic at `apps/dashboard/app/page.tsx` (redirect to /projects if authenticated, /login if not)
- [ ] T018 [US1] Implement logout functionality with token cleanup in `apps/dashboard/lib/auth.tsx`

**Checkpoint**: Login flow complete - developer can authenticate using own Permit auth

---

## Phase 4: User Story 2 - Visualização de Projetos (Priority: P1)

**Goal**: Authenticated developer can see list of all their projects with basic info

**Independent Test**: After login, verify projects list displays with name, user count, created date

### API Implementation for User Story 2

- [ ] T019 [US2] Add `ListProjectsByOwner` method to `api/internal/service/project_service.go`
- [ ] T020 [US2] Add `GetProjectsByOwnerID` query to `api/internal/repository/project_repo.go`
- [ ] T021 [US2] Implement `GET /dashboard/projects` handler in `api/internal/handler/dashboard.go`
- [ ] T022 [P] [US2] Implement `GET /dashboard/projects/{id}` handler in `api/internal/handler/dashboard.go`

### Dashboard Implementation for User Story 2

- [ ] T023 [US2] Create projects list page at `apps/dashboard/app/projects/page.tsx`
- [ ] T024 [P] [US2] Create ProjectCard component at `apps/dashboard/components/ProjectCard.tsx`
- [ ] T025 [US2] Create project details page at `apps/dashboard/app/projects/[id]/page.tsx`
- [ ] T026 [US2] Add empty state component for when developer has no projects at `apps/dashboard/components/EmptyProjects.tsx`

**Checkpoint**: Projects list working - developer can see and navigate to their projects

---

## Phase 5: User Story 3 - Visualização de Usuários (Priority: P2)

**Goal**: Developer can view all users of a project with email, auth method, last login, pagination

**Independent Test**: Navigate to project users, verify table displays with correct columns and pagination

### API Implementation for User Story 3

- [ ] T027 [US3] Add `ListProjectUsers` method to `api/internal/service/project_service.go` with pagination
- [ ] T028 [US3] Add `GetProjectUsers` query to `api/internal/repository/project_repo.go` joining `project_users` with `users`
- [ ] T029 [US3] Implement `GET /dashboard/projects/{id}/users` handler in `api/internal/handler/dashboard.go`
- [ ] T030 [US3] Update `UpdateLogin` in `api/internal/service/auth_service.go` to track `last_auth_provider` and increment `login_count` on login

### Dashboard Implementation for User Story 3

- [ ] T031 [US3] Create users list page at `apps/dashboard/app/projects/[id]/users/page.tsx`
- [ ] T032 [P] [US3] Create UsersTable component with pagination at `apps/dashboard/components/UsersTable.tsx`
- [ ] T033 [P] [US3] Create Pagination component at `apps/dashboard/components/ui/Pagination.tsx`
- [ ] T034 [US3] Add search/filter functionality to users table in `apps/dashboard/components/UsersTable.tsx`

**Checkpoint**: Users list working - developer can view and search project users

---

## Phase 6: User Story 4 - Gerenciamento de API Keys (Priority: P2)

**Goal**: Developer can view masked API keys, create new keys (shown once), and revoke keys

**Independent Test**: Navigate to API keys, create new key, verify shown once, revoke key

### API Implementation for User Story 4

- [ ] T035 [US4] Add `ListAPIKeys` method to `api/internal/service/project_service.go` returning masked secrets
- [ ] T036 [US4] Add `GetAPIKeysByProjectID` query to `api/internal/repository/project_repo.go`
- [ ] T037 [US4] Implement `GET /dashboard/projects/{id}/api-keys` handler in `api/internal/handler/dashboard.go`
- [ ] T038 [US4] Add `RevokeAPIKey` method to `api/internal/service/project_service.go`
- [ ] T039 [US4] Implement `DELETE /dashboard/projects/{id}/api-keys/{keyId}` handler in `api/internal/handler/dashboard.go`
- [ ] T040 [US4] Add `status` and `revoked_at` columns to `api_keys` table if not present (check existing schema first)

### Dashboard Implementation for User Story 4

- [ ] T041 [US4] Create API keys management page at `apps/dashboard/app/projects/[id]/api-keys/page.tsx`
- [ ] T042 [P] [US4] Create APIKeyCard component at `apps/dashboard/components/APIKeyCard.tsx` showing masked secret
- [ ] T043 [US4] Create CreateAPIKeyModal component at `apps/dashboard/components/CreateAPIKeyModal.tsx`
- [ ] T044 [US4] Implement one-time secret display with copy button in `apps/dashboard/components/CreateAPIKeyModal.tsx`
- [ ] T045 [US4] Create RevokeConfirmationModal at `apps/dashboard/components/RevokeConfirmationModal.tsx`

**Checkpoint**: API Keys management working - developer can create and revoke keys

---

## Phase 7: User Story 5 - Navegação e UX (Priority: P3)

**Goal**: Dashboard has clear navigation, loading states, error handling, smooth transitions

**Independent Test**: Navigate between sections, verify loading indicators and error messages

### Dashboard UX Implementation

- [ ] T046 [US5] Create sidebar navigation component at `apps/dashboard/components/Sidebar.tsx`
- [ ] T047 [P] [US5] Create loading skeleton components at `apps/dashboard/components/ui/Skeleton.tsx`
- [ ] T048 [P] [US5] Create toast notification system at `apps/dashboard/components/ui/Toast.tsx`
- [ ] T049 [US5] Add loading states to all data-fetching pages using React Suspense
- [ ] T050 [US5] Implement error boundary at `apps/dashboard/components/ErrorBoundary.tsx`
- [ ] T051 [US5] Add breadcrumb navigation at `apps/dashboard/components/Breadcrumb.tsx`

**Checkpoint**: Dashboard UX polished - smooth navigation with feedback for all states

---

## Phase 8: User Story 6 - Refresh Token Automático (Priority: P1)

**Goal**: SDK and Dashboard automatically refresh JWT when expired, only re-login after 7 days

**Independent Test**: Let JWT expire during session, verify automatic refresh without interruption

### SDK Implementation for User Story 6

- [ ] T052 [US6] Add axios response interceptor for 401 handling in `packages/react/src/lib/api.ts`
- [ ] T053 [US6] Implement `refreshTokens` function in `packages/react/src/lib/api.ts` calling `/auth/refresh`
- [ ] T054 [US6] Update PermitProvider to store refresh token in localStorage at `packages/react/src/PermitProvider.tsx`
- [ ] T055 [US6] Add token refresh logic to PermitProvider context in `packages/react/src/PermitProvider.tsx`
- [ ] T056 [US6] Handle refresh token expiration (7 days) with redirect to login

### Dashboard Implementation for User Story 6

- [ ] T057 [US6] Integrate SDK token refresh in dashboard API client at `apps/dashboard/lib/api.ts`
- [ ] T058 [US6] Add session persistence across page reloads in `apps/dashboard/lib/auth.tsx`

### Tests for User Story 6

- [ ] T059 [P] [US6] Add token refresh test at `packages/react/src/__tests__/token-refresh.test.ts`

**Checkpoint**: Token refresh working - sessions persist seamlessly until 7 days of inactivity

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T060 [P] Update quickstart.md with dashboard setup instructions in `specs/003-developer-dashboard/quickstart.md`
- [ ] T061 [P] Add dashboard handler tests at `api/internal/handler/dashboard_test.go`
- [ ] T062 [P] Add project service tests for new methods at `api/internal/service/project_service_test.go`
- [ ] T063 Code cleanup and remove any unused imports/variables
- [ ] T064 [P] Verify all API responses follow consistent format per contracts
- [ ] T065 Security review: ensure owner can only access their own projects
- [ ] T066 Run full browser test flow per verification plan in plan.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - enables login
- **User Story 2 (Phase 4)**: Depends on Phase 3 (needs auth) - enables project viewing
- **User Story 3 (Phase 5)**: Depends on Phase 4 (needs project context)
- **User Story 4 (Phase 6)**: Depends on Phase 4 (needs project context), parallel with US3
- **User Story 5 (Phase 7)**: Can build incrementally alongside other stories
- **User Story 6 (Phase 8)**: Can start after Phase 2, parallel with other stories
- **Polish (Phase 9)**: Depends on all user stories complete

### User Story Dependencies

```
Phase 2 (Foundation)
    │
    ├── US1 (Login) ──────────────────────────────────┐
    │       │                                         │
    │       └── US2 (Projects) ───────────────────────┤
    │               │                                 │
    │               ├── US3 (Users) ──────────────────┤
    │               │                                 │
    │               └── US4 (API Keys) ───────────────┤
    │                                                 │
    ├── US6 (Token Refresh) ──────────────────────────┤
    │                                                 │
    └── US5 (UX) can build incrementally ─────────────┘
                                                      │
                                                      ▼
                                              Phase 9 (Polish)
```

### Parallel Opportunities

- **Phase 1**: T002, T003, T004 can run in parallel
- **Phase 2**: T008, T009, T010 can run in parallel; T012, T013 can run in parallel
- **Phase 4**: T022, T024 can run in parallel (different files)
- **Phase 5**: T032, T033 can run in parallel
- **Phase 6**: T042 can run in parallel
- **Phase 8**: T059 can run in parallel
- **Phase 9**: T060, T061, T062, T064 all run in parallel

---

## Parallel Example: Phase 4 (User Story 2)

```bash
# API endpoints can be built in parallel (different handlers):
Task T021: "Implement GET /dashboard/projects handler"
Task T022: "Implement GET /dashboard/projects/{id} handler"

# Dashboard components can be built in parallel:
Task T024: "Create ProjectCard component"
Task T026: "Create EmptyProjects component"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete Phase 3: User Story 1 (Login)
4. Complete Phase 4: User Story 2 (Projects)
5. **STOP and VALIDATE**: Test login + projects flow
6. Deploy/demo if ready for internal testing

### Recommended Order

1. **Phase 1-2**: Setup + Foundation (2-3 hours)
2. **Phase 3-4**: Login + Projects (MVP) (4-6 hours)
3. **Phase 8**: Token Refresh (parallel with above) (2-3 hours)
4. **Phase 5-6**: Users + API Keys (4-6 hours)
5. **Phase 7**: UX Polish (2-3 hours)
6. **Phase 9**: Final polish + tests (2-3 hours)

**Estimated Total**: 16-24 hours of development

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- API and Dashboard tasks for same story can be parallelized by different developers
