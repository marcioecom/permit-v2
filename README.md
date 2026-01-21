# Permit - Auth as a Service

Embedded authentication solution with React SDK and Node.js server SDK.

## Packages

| Package | Description | NPM |
|---------|-------------|-----|
| [@permitdev/react](./packages/react) | React SDK for client-side auth | [![npm](https://img.shields.io/npm/v/@permitdev/react)](https://www.npmjs.com/package/@permitdev/react) |
| [@permitdev/server](./packages/server) | Server SDK for JWT validation | [![npm](https://img.shields.io/npm/v/@permitdev/server)](https://www.npmjs.com/package/@permitdev/server) |

## Quick Start

### 1. Install Packages

```bash
# Client SDK (React)
npm install @permitdev/react

# Server SDK (Node.js/Next.js)
npm install @permitdev/server
```

### 2. Client Setup (React)

```tsx
import { PermitProvider, usePermit, PermitModal } from '@permitdev/react';

function App() {
  return (
    <PermitProvider projectId="01K...">
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

### 3. Server Setup (Next.js App Router)

```typescript
// app/api/protected/route.ts
import { withPermitAuth } from '@permitdev/server/next';

export const GET = withPermitAuth(async (req, { user }) => {
  return Response.json({
    message: `Hello ${user.email}`,
    userId: user.userId
  });
}, {
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
});
```

### 4. Environment Variables

```bash
# .env.local
PERMIT_CLIENT_ID=pk_abc123...
PERMIT_CLIENT_SECRET=sk_xyz789...
```

> **Security**: Never expose `clientSecret` in client-side code.

## Development

```bash
# Install dependencies
pnpm install

# Start development
pnpm dev:sdk        # Watch mode for all SDK packages
pnpm test:sdk       # Run all SDK tests

# Build
pnpm build:sdk
```

## Documentation

- [Full Quickstart Guide](./specs/002-sdk-npm-deploy/quickstart.md)
- [React SDK README](./packages/react/README.md)
- [Server SDK README](./packages/server/README.md)

## Project Structure

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

api/                    # Go backend
├── cmd/server/
└── internal/

examples/
└── nextjs/             # Example Next.js application
```

## License

MIT
