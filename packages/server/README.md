# @permitdev/server

Server SDK for Permit authentication - JWT validation and middleware for Node.js backends.

## Installation

```bash
npm install @permitdev/server
# or
pnpm add @permitdev/server
# or
yarn add @permitdev/server
```

## Quick Start

### Basic Token Verification

```typescript
import { PermitAuth } from '@permitdev/server';

const permit = new PermitAuth({
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
});

const result = await permit.verifyToken(accessToken);

if (result.valid) {
  console.log('User ID:', result.user.userId);
  console.log('Email:', result.user.email);
} else {
  console.log('Error:', result.errorCode, result.error);
}
```

### Express Middleware

```typescript
import express from 'express';
import { createPermitMiddleware } from '@permitdev/server/middleware';

const app = express();

app.use('/api/protected', createPermitMiddleware({
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
}));

app.get('/api/protected/me', (req, res) => {
  res.json({ user: req.permitUser });
});
```

### Next.js App Router

```typescript
// app/api/protected/route.ts
import { withPermitAuth } from '@permitdev/server/next';

export const GET = withPermitAuth(async (req, { user }) => {
  return Response.json({
    message: `Hello ${user.email}`,
    userId: user.userId,
  });
}, {
  clientId: process.env.PERMIT_CLIENT_ID!,
  clientSecret: process.env.PERMIT_CLIENT_SECRET!,
});
```

## API Reference

### PermitAuth

Main class for token verification.

```typescript
const permit = new PermitAuth({
  clientId: string,       // Required: pk_... from dashboard
  clientSecret: string,   // Required: sk_... from dashboard
  baseUrl?: string,       // Optional: API URL (default: https://api.permit.dev)
  cacheTtl?: number,      // Optional: JWKS cache TTL in ms (default: 24h)
});

const result = await permit.verifyToken(token);
```

### VerificationResult

```typescript
interface VerificationResult {
  valid: boolean;
  user?: PermitUser;
  error?: string;
  errorCode?: ErrorCode;
}

interface PermitUser {
  userId: string;
  email: string;
  appId: string;
  provider: string;
  issuedAt: Date;
  expiresAt: Date;
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `TOKEN_EXPIRED` | Token has expired |
| `INVALID_SIGNATURE` | Signature verification failed |
| `INVALID_ISSUER` | Token issuer mismatch |
| `INVALID_AUDIENCE` | Token audience mismatch |
| `MALFORMED_TOKEN` | Token format is invalid |
| `JWKS_FETCH_FAILED` | Could not fetch JWKS keys |
| `INVALID_CREDENTIALS` | clientId/clientSecret invalid |
| `CREDENTIALS_REQUIRED` | Missing clientId or clientSecret |

## Security

⚠️ **IMPORTANT**: Never expose your `clientSecret` (sk_...) to the client. Store it in environment variables and only use it in server-side code.

## Client SDK

For the React client SDK, see [@permitdev/react](https://www.npmjs.com/package/@permitdev/react).

## License

MIT
