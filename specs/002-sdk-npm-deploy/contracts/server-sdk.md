# Server SDK API Contract

## `@permitdev/server` Public API

### Initialization

```typescript
import { PermitAuth } from '@permitdev/server';

const permit = new PermitAuth({
  // REQUIRED: API credentials (from Permit dashboard)
  clientId: 'pk_...',        // Public client ID
  clientSecret: 'sk_...',    // Secret key - NEVER expose to client

  // Optional overrides for self-hosted
  baseUrl: 'https://api.permit.dev',  // Permit API base URL
  cacheTtl: 24 * 60 * 60 * 1000,      // JWKS cache TTL (24h default)
});
```

> ⚠️ **SECURITY**: The `clientSecret` (sk_...) must NEVER be exposed to the client/browser.
> Store it in environment variables and only use it in server-side code.

### Token Verification

```typescript
// Returns VerificationResult
const result = await permit.verifyToken(accessToken);

if (result.valid) {
  console.log(result.user.userId);
  console.log(result.user.email);
  console.log(result.user.appId);
} else {
  console.log(result.errorCode); // 'TOKEN_EXPIRED', 'INVALID_SECRET', etc.
  console.log(result.error);     // Human-readable message
}
```

### Express/Next.js Middleware

```typescript
import { createPermitMiddleware } from '@permitdev/server';

// Express
app.use('/api/protected', createPermitMiddleware({
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
  onError: (res, err) => res.status(401).json({ error: err.message }),
}));

// Next.js App Router
import { withPermitAuth } from '@permitdev/server/next';

export const GET = withPermitAuth(async (req, { user }) => {
  return Response.json({ userId: user.userId });
}, {
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
});
```

### Type Exports

```typescript
export interface PermitUser {
  userId: string;
  email: string;
  appId: string;
  provider: string;
  issuedAt: Date;
  expiresAt: Date;
  metadata?: Record<string, unknown>;
}

export interface PermitConfig {
  clientId: string;       // REQUIRED: pk_... from dashboard
  clientSecret: string;   // REQUIRED: sk_... from dashboard
  baseUrl?: string;       // Optional: Permit API URL
  cacheTtl?: number;      // Optional: JWKS cache TTL in ms
}

export interface VerificationResult {
  valid: boolean;
  user?: PermitUser;
  error?: string;
  errorCode?: ErrorCode;
}

export type ErrorCode =
  | 'TOKEN_EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'MALFORMED_TOKEN'
  | 'JWKS_FETCH_FAILED'
  | 'INVALID_CREDENTIALS'   // clientId/clientSecret invalid
  | 'CREDENTIALS_REQUIRED'; // Missing clientId or clientSecret
```

## Authentication Flow

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Developer's   │       │  Permit Server  │       │   Permit API    │
│    Backend      │       │      SDK        │       │    Backend      │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ 1. Initialize SDK       │                         │
         │   (clientId, clientSecret)                        │
         │─────────────────────────>                         │
         │                         │                         │
         │                         │ 2. Validate credentials │
         │                         │    + fetch JWKS         │
         │                         │─────────────────────────>
         │                         │                         │
         │                         │ 3. Return JWKS (cached  │
         │                         │    for 24h)             │
         │                         │<─────────────────────────
         │                         │                         │
         │ 4. verifyToken(jwt)     │                         │
         │─────────────────────────>                         │
         │                         │                         │
         │ 5. Verify JWT using     │                         │
         │    cached JWKS          │                         │
         │<─────────────────────────                         │
         │                         │                         │
```
