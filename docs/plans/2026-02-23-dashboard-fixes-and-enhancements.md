# Dashboard Fixes and Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 500 errors on project/API key creation caused by missing `environment_id`, enable Google/GitHub toggle on project creation, add environment creation to EnvironmentSwitcher, and clean up commented code.

**Architecture:** The migration 005 added `environment_id NOT NULL` to `project_api_keys`, `project_users`, `otp_codes`, `refresh_tokens`, `auth_logs`, and `widgets`. But the Go service/repository code was never updated to supply `environment_id` when inserting into these tables. The fix requires: (1) creating a default environment when a project is created, (2) passing `environment_id` through the create flows, (3) updating the frontend create project page to support Google/GitHub toggles, (4) adding "Create environment" to EnvironmentSwitcher.

**Tech Stack:** Go (chi router, pgx), Next.js 16, React, TanStack Query, Tailwind CSS, @tabler/icons-react

---

## Worktree

All changes happen in: `/Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth`

---

### Task 1: Fix project creation - create default environment and pass environment_id

The root cause of the 500 error: `CreateProject` inserts into `project_api_keys` without `environment_id` (which is NOT NULL). The fix: after creating the project, create a default "Development" environment, then use its ID for the API key.

**Files:**
- Modify: `api/internal/service/project_service.go:34-79` (CreateProject method)
- Modify: `api/internal/repository/project_repo.go:126-133` (CreateAPIKey - add environment_id)
- Modify: `api/internal/models/project.go` (add EnvironmentID to APIKey if missing)

**Step 1: Update `ProjectService` to accept `EnvironmentRepository` dependency**

In `api/internal/service/project_service.go`, change the struct and constructor:

```go
type ProjectService struct {
	repo    repository.ProjectRepository
	envRepo repository.EnvironmentRepository
}

func NewProjectService(repo repository.ProjectRepository, envRepo repository.EnvironmentRepository) *ProjectService {
	return &ProjectService{repo: repo, envRepo: envRepo}
}
```

**Step 2: Update `CreateProject` to create default environment and use its ID**

In `api/internal/service/project_service.go`, update `CreateProject`:

```go
func (s *ProjectService) CreateProject(ctx context.Context, input CreateProjectInput) (*CreateProjectOutput, error) {
	if input.Name == "" {
		return nil, fmt.Errorf("name_required")
	}

	providers := input.AllowedProviders
	if len(providers) == 0 {
		providers = []string{"email"}
	}

	project := &models.Project{
		ID:               ulid.Make().String(),
		OwnerID:          input.OwnerID,
		Name:             input.Name,
		Description:      &input.Description,
		AllowedOrigins:   input.AllowedOrigins,
		AllowedProviders: providers,
	}

	if err := s.repo.Create(ctx, project); err != nil {
		return nil, err
	}

	// Create default development environment
	env := &models.Environment{
		ID:             "env_" + project.ID,
		ProjectID:      project.ID,
		Name:           "Development",
		Type:           models.EnvTypeDevelopment,
		AllowedOrigins: input.AllowedOrigins,
	}
	if err := s.envRepo.Create(ctx, env); err != nil {
		return nil, err
	}

	clientID := repository.GenerateClientID()
	clientSecret, secretHash, err := repository.GenerateClientSecret()
	if err != nil {
		return nil, err
	}

	apiKey := &models.APIKey{
		ID:               ulid.Make().String(),
		ProjectID:        project.ID,
		EnvironmentID:    env.ID,
		Name:             "Default",
		ClientID:         clientID,
		ClientSecretHash: secretHash,
	}
	if err := s.repo.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &CreateProjectOutput{
		Project:      project,
		ClientID:     clientID,
		ClientSecret: clientSecret,
	}, nil
}
```

**Step 3: Add `EnvironmentID` field to `APIKey` model**

In `api/internal/models/project.go`, add `EnvironmentID` to the `APIKey` struct:

```go
type APIKey struct {
	ID               string     `json:"id"`
	ProjectID        string     `json:"projectId"`
	EnvironmentID    string     `json:"environmentId"`
	Name             string     `json:"name"`
	ClientID         string     `json:"clientId"`
	ClientSecretHash string     `json:"-"`
	LastUsedAt       *time.Time `json:"lastUsedAt,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
}
```

**Step 4: Update `CreateAPIKey` repository to include `environment_id`**

In `api/internal/repository/project_repo.go`, update the `CreateAPIKey` method:

```go
func (r *postgresProjectRepo) CreateAPIKey(ctx context.Context, key *models.APIKey) error {
	query := `
		INSERT INTO project_api_keys (id, project_id, environment_id, name, client_id, client_secret_hash, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
	`
	_, err := r.db.Exec(ctx, query, key.ID, key.ProjectID, key.EnvironmentID, key.Name, key.ClientID, key.ClientSecretHash)
	return err
}
```

**Step 5: Update `CreateAPIKey` in the service to resolve environment**

In `api/internal/service/project_service.go`, update the standalone `CreateAPIKey` method to resolve the default environment:

```go
func (s *ProjectService) CreateAPIKey(ctx context.Context, input CreateAPIKeyInput) (*CreateAPIKeyOutput, error) {
	// Resolve default environment for the project
	env, err := s.envRepo.GetDefaultForProject(ctx, input.ProjectID)
	if err != nil {
		return nil, fmt.Errorf("environment_not_found")
	}

	clientID := repository.GenerateClientID()
	clientSecret, secretHash, err := repository.GenerateClientSecret()
	if err != nil {
		return nil, err
	}

	name := input.Name
	if name == "" {
		name = "API Key"
	}

	apiKey := &models.APIKey{
		ID:               ulid.Make().String(),
		ProjectID:        input.ProjectID,
		EnvironmentID:    env.ID,
		Name:             name,
		ClientID:         clientID,
		ClientSecretHash: secretHash,
	}

	if err := s.repo.CreateAPIKey(ctx, apiKey); err != nil {
		return nil, err
	}

	return &CreateAPIKeyOutput{
		ID:           apiKey.ID,
		ClientID:     clientID,
		ClientSecret: clientSecret,
		Name:         name,
	}, nil
}
```

**Step 6: Update `NewProjectService` call in `main.go` (or wherever services are wired up)**

Find where `NewProjectService` is called and add the `envRepo` parameter. Search for `NewProjectService` in `cmd/server/main.go` or similar.

Run: `grep -rn "NewProjectService" api/`
Update the call to pass `envRepo`.

**Step 7: Verify the fix**

Run the API:
```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api && go build ./cmd/server
```

Expected: Compiles without errors.

Test project creation:
```bash
curl -s -X POST "http://localhost:8080/api/v1/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"Test Project","allowedOrigins":["http://localhost:3000"],"allowedProviders":["email"]}'
```

Expected: 201 with project data, clientId, clientSecret (no 500 error).

**Step 8: Commit**

```bash
git add api/internal/service/project_service.go api/internal/repository/project_repo.go api/internal/models/project.go api/cmd/server/main.go
git commit -m "fix: create default environment on project creation, pass environment_id to API keys"
```

---

### Task 2: Enable Google/GitHub toggles on project creation page

Currently the create project page shows Google SSO, GitHub SSO, and Apple SSO as "Coming Soon" with opacity-60. We need to make Google and GitHub toggleable (Apple stays "Coming Soon").

**Files:**
- Modify: `apps/dashboard/src/app/(dashboard)/projects/new/page.tsx`

**Step 1: Update the auth methods state and UI**

Replace the hardcoded "Coming Soon" providers section with toggleable Google and GitHub. The full updated file should have these changes:

1. Change `authMethods` state to include google and github:
```tsx
const [authMethods, setAuthMethods] = useState({
  email: true,
  google: false,
  github: false,
});
```

2. Add toggle handler:
```tsx
const toggleProvider = (provider: "google" | "github") => {
  setAuthMethods((prev) => ({ ...prev, [provider]: !prev[provider] }));
};
```

3. Replace the SSO providers list with toggleable items for Google and GitHub:

For Google and GitHub, render them with a `Toggle` component (already imported from `@/components/ui`) and a proper icon (`IconBrandGoogle`, `IconBrandGithub` from `@tabler/icons-react`). Keep the opacity-60 and "Coming Soon" badge only for Apple.

When the environment is "development", show a small note under enabled providers: "Uses shared Permit credentials for development".

4. Update imports to include `IconBrandGoogle` and `IconBrandGithub` from `@tabler/icons-react`.

**Step 2: Verify**

Navigate to `http://localhost:3000/projects/new`. Google and GitHub should now be toggleable. Apple should still show "Coming Soon".

**Step 3: Commit**

```bash
git add apps/dashboard/src/app/(dashboard)/projects/new/page.tsx
git commit -m "feat: enable Google and GitHub SSO toggles on project creation"
```

---

### Task 3: Add "Create Environment" option to EnvironmentSwitcher

Add a divider and "New Environment" button at the bottom of the EnvironmentSwitcher dropdown. Clicking it opens a small inline form (name + type select) or a simple dialog.

**Files:**
- Modify: `apps/dashboard/src/components/layout/EnvironmentSwitcher.tsx`
- Modify: `apps/dashboard/src/hooks/useSelectedEnvironment.ts` (clean up commented code)

**Step 1: Clean up `useSelectedEnvironment.ts`**

Remove the commented-out old implementation (lines 60-107) from `apps/dashboard/src/hooks/useSelectedEnvironment.ts`. The file should only contain the active implementation (lines 1-58).

**Step 2: Add environment creation to EnvironmentSwitcher**

Update `apps/dashboard/src/components/layout/EnvironmentSwitcher.tsx` to:

1. Import `useEnvironments` and `IconPlus` from `@tabler/icons-react`
2. Add a `creating` state and a mini-form state
3. After the environment list, add a divider and "New Environment" button
4. When clicked, show an inline form with:
   - Name input (text)
   - Type select (staging, production - development already exists usually)
   - Create button
5. On submit, call `createEnvironment.mutateAsync({ name, type })` from `useEnvironments` hook
6. After creation, select the new environment

The UI should follow the existing dropdown style: `text-xs`, `px-3 py-2`, `slate-600` text, `hover:bg-slate-50`.

```tsx
"use client";

import { useEnvironments } from "@/hooks/useEnvironments";
import { useSelectedEnvironment } from "@/hooks/useSelectedEnvironment";
import { IconChevronDown, IconCircleFilled, IconPlus } from "@tabler/icons-react";
import { useRef, useState } from "react";

interface EnvironmentSwitcherProps {
  projectId: string;
}

const ENV_COLORS: Record<string, string> = {
  development: "#6b7280",
  staging: "#f59e0b",
  production: "#10b981",
};

export function EnvironmentSwitcher({ projectId }: EnvironmentSwitcherProps) {
  const { environment, environments, setEnvironment } = useSelectedEnvironment(projectId);
  const { createEnvironment } = useEnvironments(projectId);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("staging");
  const ref = useRef<HTMLDivElement>(null);

  if (!environment) return null;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const env = await createEnvironment.mutateAsync({ name: newName.trim(), type: newType });
      setEnvironment(env.id);
      setCreating(false);
      setNewName("");
      setNewType("staging");
      setOpen(false);
    } catch {
      // silently fail - mutation error handled by react-query
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        onBlur={(e) => {
          if (!ref.current?.contains(e.relatedTarget)) {
            setOpen(false);
            setCreating(false);
          }
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
      >
        <IconCircleFilled className="w-2.5 h-2.5" style={{ color: environment.color }} />
        {environment.name}
        <IconChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 min-w-[200px]">
          {environments.map((env) => (
            <button
              key={env.id}
              onClick={() => {
                setEnvironment(env.id);
                setOpen(false);
                setCreating(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors ${
                env.id === environment.id
                  ? "bg-slate-50 text-slate-900 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconCircleFilled className="w-2.5 h-2.5" style={{ color: env.color }} />
              {env.name}
            </button>
          ))}

          <div className="border-t border-slate-100 mt-1 pt-1">
            {!creating ? (
              <button
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <IconPlus className="w-3 h-3" />
                New Environment
              </button>
            ) : (
              <div className="px-3 py-2 space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Environment name"
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 outline-none"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 outline-none bg-white"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { setCreating(false); setNewName(""); }}
                    className="flex-1 px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || createEnvironment.isPending}
                    className="flex-1 px-2 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {createEnvironment.isPending ? "..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Verify**

Open a project page in the dashboard. Click the EnvironmentSwitcher. You should see the list of environments plus a "New Environment" option at the bottom. Clicking it shows an inline form. Creating a new environment should work and auto-select it.

**Step 4: Commit**

```bash
git add apps/dashboard/src/components/layout/EnvironmentSwitcher.tsx apps/dashboard/src/hooks/useSelectedEnvironment.ts
git commit -m "feat: add environment creation to EnvironmentSwitcher, clean up commented code"
```

---

### Task 4: Fix `UpsertProjectUser` to include environment_id

The `UpsertProjectUser` method in the repo doesn't pass `environment_id`. The OAuth callback flow calls this, and it will fail because `environment_id` is NOT NULL on `project_users`.

**Files:**
- Modify: `api/internal/repository/project_repo.go:741-752` (UpsertProjectUser)
- Modify: `api/internal/service/oauth_service.go` (pass environmentID to UpsertProjectUser)

**Step 1: Update `UpsertProjectUser` signature and query**

In `api/internal/repository/project_repo.go`:

```go
func (r *postgresProjectRepo) UpsertProjectUser(ctx context.Context, projectID, environmentID, userID, provider string) error {
	query := `
		INSERT INTO project_users (user_id, project_id, environment_id, last_login, login_count, last_auth_provider, created_at)
		VALUES ($1, $2, $3, NOW(), 1, $4, NOW())
		ON CONFLICT (user_id, environment_id) DO UPDATE SET
			last_login = NOW(),
			login_count = project_users.login_count + 1,
			last_auth_provider = $4
	`
	_, err := r.db.Exec(ctx, query, userID, projectID, environmentID, provider)
	return err
}
```

**Step 2: Update the interface**

In `api/internal/repository/project_repo.go`, update the interface:

```go
UpsertProjectUser(ctx context.Context, projectID, environmentID, userID, provider string) error
```

**Step 3: Update callers**

In `api/internal/service/oauth_service.go`, the `HandleCallback` method calls `UpsertProjectUser`. Update line ~211:

```go
if err := s.projectRepo.UpsertProjectUser(ctx, env.ProjectID, oauthState.EnvironmentID, userID, oauthState.Provider); err != nil {
```

Also check if there are other callers (OTP verify flow). Search for `UpsertProjectUser` and update all callers to pass `environmentID`.

**Step 4: Verify**

```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api && go build ./cmd/server
```

Expected: Compiles without errors.

**Step 5: Commit**

```bash
git add api/internal/repository/project_repo.go api/internal/service/oauth_service.go
git commit -m "fix: pass environment_id to UpsertProjectUser"
```

---

### Task 5: Fix OTP auth flow to include environment_id

The OTP flow (start/verify) also inserts into tables that now require `environment_id`. Check the OTP handler and service for missing `environment_id`.

**Files:**
- Inspect: `api/internal/handler/auth.go`
- Inspect: `api/internal/service/auth_service.go`
- Modify as needed

**Step 1: Search for OTP-related code that inserts into affected tables**

```bash
grep -rn "otp_codes\|refresh_tokens\|project_users\|auth_logs" api/internal/ --include="*.go" | grep -i "insert\|upsert"
```

Look at each INSERT statement and ensure `environment_id` is provided.

Tables requiring `environment_id`:
- `project_api_keys` - Fixed in Task 1
- `project_users` - Fixed in Task 4
- `otp_codes` - Check OTP service
- `refresh_tokens` - Check session/token service
- `auth_logs` - Check auth logging

**Step 2: Fix each INSERT that's missing environment_id**

For each affected table, add `environment_id` to the INSERT query and pass it through the call chain. The environment_id can be derived from the project_id using `envRepo.GetDefaultForProject()` or from the `env_` + projectID convention.

**Step 3: Verify**

```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api && go build ./cmd/server
```

Test the OTP flow end-to-end to ensure login still works.

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: pass environment_id through OTP and session flows"
```

---

### Task 6: End-to-end verification

**Step 1: Restart the API**

```bash
cd /Users/marciojunior/code/marcioecom/permit-v2/.worktrees/sso-oauth/api && go run cmd/server/main.go
```

**Step 2: Test project creation**

Create a new project via the dashboard UI at `/projects/new`. Enable Google and GitHub toggles. Verify it succeeds (no 500).

**Step 3: Test API key creation**

Go to the new project's API Keys page. Create a new API key. Verify it succeeds (no 500).

**Step 4: Test environment creation**

On a project page, use the EnvironmentSwitcher to create a new "Staging" environment. Verify it appears and can be selected.

**Step 5: Test OAuth flow**

Try signing in with Google and GitHub on the example app. Verify the full flow still works.

**Step 6: Test OTP flow**

Try signing in with email OTP. Verify it still works end-to-end.
