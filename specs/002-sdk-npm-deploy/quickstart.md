# Quickstart: SDK NPM Deploy

## For SDK Users

### 1. Install Packages

```bash
# Client SDK (React)
npm install @permitdev/react

# Server SDK (Node.js/Next.js)
npm install @permitdev/server
```

### 2. Get API Credentials

1. Go to the Permit dashboard
2. Navigate to your project → Settings → API Keys
3. Copy your `clientId` (pk_...) and `clientSecret` (sk_...)

> ⚠️ **SECURITY**: Never expose `clientSecret` in client-side code.
> Store it in environment variables.

```bash
# .env.local (Next.js example)
PERMIT_CLIENT_ID=pk_abc123...
PERMIT_CLIENT_SECRET=sk_xyz789...
```

### 3. Client Setup (React)

```tsx
import { PermitProvider, usePermit, PermitModal } from '@permitdev/react';

function App() {
  return (
    // clientId is safe to expose (pk_...)
    <PermitProvider clientId="pk_..." baseUrl="https://api.permit.dev">
      <YourApp />
    </PermitProvider>
  );
}

function YourApp() {
  const { user, isAuthenticated, getAccessToken } = usePermit();

  if (!isAuthenticated) {
    return <PermitModal />;
  }

  return <div>Welcome, {user?.email}</div>;
}
```

### 4. Server Setup (Next.js App Router)

```typescript
// app/api/protected/route.ts
import { withPermitAuth } from '@permitdev/server/next';

export const GET = withPermitAuth(async (req, { user }) => {
  return Response.json({
    message: `Hello ${user.email}`,
    userId: user.userId
  });
}, {
  // Both are REQUIRED for security
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
});
```

### 5. Fetch Protected Data (Client)

```tsx
const { getAccessToken } = usePermit();

const response = await fetch('/api/protected', {
  headers: {
    Authorization: `Bearer ${await getAccessToken()}`,
  },
});
```

---

## For SDK Maintainers

### Development Setup

```bash
# Clone and install
git clone https://github.com/marcioecom/permit-v2
cd permit-v2
pnpm install

# Start development
pnpm dev:sdk        # Watch mode for all SDK packages
pnpm test:sdk       # Run all SDK tests
```

### Release Process

```bash
# 1. Create changeset
pnpm changeset

# 2. Version packages
pnpm changeset version

# 3. Publish (automated via GitHub Actions on merge to main)
pnpm publish -r
```

### Project Structure

```
packages/
├── react/              # @permitdev/react (client SDK)
│   ├── src/
│   └── package.json
└── server/             # @permitdev/server (server SDK)
    ├── src/
    │   ├── index.ts
    │   ├── verify.ts      # Token verification with JWKS
    │   ├── middleware/
    │   └── next/
    └── package.json
```
