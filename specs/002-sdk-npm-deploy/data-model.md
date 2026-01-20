# Data Model: SDK NPM Deploy

**Feature**: 002-sdk-npm-deploy
**Date**: 2026-01-18 (Updated: 2026-01-19)

## Server SDK Types

### PermitConfig (SDK initialization) - UPDATED

| Field          | Type      | Description                              | Required |
|----------------|-----------|------------------------------------------|----------|
| `clientId`     | `string`  | Public client ID (`pk_...`)              | **Yes**  |
| `clientSecret` | `string`  | Secret key (`sk_...`) - NEVER expose     | **Yes**  |
| `baseUrl`      | `string`  | Permit API base URL                      | No*      |
| `cacheTtl`     | `number`  | JWKS cache TTL in ms (default 24h)       | No       |

*Defaults to `https://api.permit.dev`

> ⚠️ **SECURITY**: `clientSecret` authenticates your backend to Permit's API.
> Without it, anyone with your `clientId` could verify tokens for your app.

### PermitUser (returned from token verification)

| Field       | Type              | Description                         |
|-------------|-------------------|-------------------------------------|
| `userId`    | `string`          | Unique user identifier              |
| `email`     | `string`          | User's email address                |
| `appId`     | `string`          | Project/app identifier              |
| `provider`  | `string`          | Auth provider: "email", "google"    |
| `issuedAt`  | `Date`            | When token was issued               |
| `expiresAt` | `Date`            | When token expires                  |
| `metadata`  | `Record<string, unknown>` | Custom metadata (future)    |

### VerificationResult

| Field       | Type          | Description                     |
|-------------|---------------|---------------------------------|
| `valid`     | `boolean`     | Whether token is valid          |
| `user`      | `PermitUser?` | User data if valid              |
| `error`     | `string?`     | Error message if invalid        |
| `errorCode` | `string?`     | Machine-readable error code     |

### Error Codes - UPDATED

| Code                  | Description                          |
|-----------------------|--------------------------------------|
| `TOKEN_EXPIRED`       | Token has expired                    |
| `INVALID_SIGNATURE`   | Token signature verification failed  |
| `INVALID_ISSUER`      | Token issuer mismatch                |
| `INVALID_AUDIENCE`    | Token audience mismatch              |
| `MALFORMED_TOKEN`     | Token format is invalid              |
| `JWKS_FETCH_FAILED`   | Could not fetch JWKS keys            |
| `INVALID_CREDENTIALS` | clientId/clientSecret invalid        |
| `CREDENTIALS_REQUIRED`| Missing clientId or clientSecret     |

## API Key Structure (from Permit API)

| Field              | Type     | Description                              |
|--------------------|----------|------------------------------------------|
| `clientId`         | `string` | Public identifier (`pk_...` prefix)      |
| `clientSecretHash` | `string` | Bcrypt hash of secret (stored in DB)     |
| `projectId`        | `string` | Associated project ID                    |
| `name`             | `string` | Human-readable name                      |

### API Key Prefixes

- `pk_` = Public Key (clientId) - Safe to expose in client code
- `sk_` = Secret Key (clientSecret) - **NEVER expose**, server-side only

## JWKS Endpoint Response (from API)

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-id",
      "alg": "RS256",
      "n": "modulus-base64url",
      "e": "exponent-base64url"
    }
  ]
}
```

## JWT Access Token Claims

| Claim      | Type       | Description              |
|------------|------------|--------------------------|
| `iss`      | `string`   | Issuer ("permit")        |
| `sub`      | `string`   | Subject (user ID)        |
| `aud`      | `string[]` | Audience (project ID)    |
| `exp`      | `number`   | Expiration timestamp     |
| `iat`      | `number`   | Issued at timestamp      |
| `jti`      | `string`   | Unique token ID          |
| `email`    | `string`   | User email               |
| `uid`      | `string`   | User ID                  |
| `pid`      | `string`   | Project ID               |
| `provider` | `string`   | Auth provider            |
