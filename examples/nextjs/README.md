# Next.js Example - Permit Authentication

This example demonstrates the full authentication flow using Permit SDKs:
- **Client**: `@permitdev/react` for React components and hooks
- **Server**: `@permitdev/server` for JWT validation

## Quick Start

### 1. Install dependencies

From the repository root:

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cd examples/nextjs
cp .env.example .env.local
```

Edit `.env.local` with your Permit credentials:

```env
PERMIT_CLIENT_ID=pk_your_client_id
PERMIT_CLIENT_SECRET=sk_your_client_secret
NEXT_PUBLIC_PERMIT_CLIENT_ID=pk_your_client_id
NEXT_PUBLIC_PERMIT_BASE_URL=http://localhost:8080
```

### 3. Start the Permit API (if running locally)

```bash
cd api
go run ./cmd/server/main.go
```

### 4. Run the example

```bash
cd examples/nextjs
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## What This Example Demonstrates

### Client-Side (`app/page.tsx`)

- **Authentication UI**: Uses `PermitModal` for OTP login
- **User State**: Uses `usePermit` hook to access user data
- **Token Management**: Uses `getAccessToken()` for API requests
- **Logout**: Clears tokens and resets state

### Server-Side (`app/api/protected/route.ts`)

- **JWT Validation**: Uses `withPermitAuth` middleware
- **User Context**: Accesses validated user info in route handlers
- **Error Handling**: Returns 401 for invalid/missing tokens

### Layout (`app/layout.tsx`)

- **Provider Setup**: Wraps app with `PermitProvider`
- **Configuration**: Sets client ID and base URL

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │     │   Next.js App   │     │   Permit API    │
│                 │     │                 │     │                 │
│  PermitModal    │────>│  /api/protected │────>│  /.well-known/  │
│  usePermit()    │<────│  withPermitAuth │<────│  jwks.json      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Files

| File | Description |
|------|-------------|
| `app/layout.tsx` | Root layout with PermitProvider |
| `app/page.tsx` | Home page with auth UI |
| `app/api/protected/route.ts` | Protected API route |
| `.env.example` | Environment variable template |

## Troubleshooting

### "Invalid token" error

Make sure your `PERMIT_CLIENT_SECRET` is set correctly in `.env.local`.

### "Failed to fetch JWKS"

Check that the Permit API is running and accessible at the configured base URL.

### Modal doesn't appear

Ensure `NEXT_PUBLIC_PERMIT_CLIENT_ID` is set in your environment.
