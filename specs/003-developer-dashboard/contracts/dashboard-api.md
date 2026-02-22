# API Contracts: Dashboard Endpoints

**Feature**: 003-developer-dashboard
**Date**: 2026-01-24
**Base URL**: `/dashboard`

## Authentication

All dashboard endpoints require JWT authentication via `Authorization: Bearer <token>` header.
The token must be from an owner (developer) account, not a project API key.

---

## Endpoints

### List Owner Projects

```http
GET /dashboard/projects
Authorization: Bearer <jwt>
```

**Response 200**:
```json
{
  "data": [
    {
      "id": "01HJNXYZ...",
      "name": "My SaaS App",
      "description": "Main production app",
      "userCount": 1234,
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-20T15:30:00Z"
    }
  ],
  "meta": {
    "total": 3
  }
}
```

---

### Get Project Details

```http
GET /dashboard/projects/{projectId}
Authorization: Bearer <jwt>
```

**Response 200**:
```json
{
  "data": {
    "id": "01HJNXYZ...",
    "name": "My SaaS App",
    "description": "Main production app",
    "allowedOrigins": ["https://myapp.com"],
    "allowedProviders": ["email", "google"],
    "userCount": 1234,
    "apiKeyCount": 2,
    "createdAt": "2026-01-15T10:00:00Z",
    "updatedAt": "2026-01-20T15:30:00Z"
  }
}
```

**Response 404**:
```json
{
  "error": {
    "code": "not_found",
    "message": "Project not found"
  }
}
```

---

### List Project Users

```http
GET /dashboard/projects/{projectId}/users?page=1&limit=50
Authorization: Bearer <jwt>
```

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | int | 1 | Page number (1-indexed) |
| limit | int | 50 | Items per page (max 100) |
| search | string | - | Filter by email (contains) |

**Response 200**:
```json
{
  "data": [
    {
      "id": "01HJUSER...",
      "email": "user@example.com",
      "authMethod": "google",
      "loginCount": 15,
      "createdAt": "2026-01-10T08:00:00Z",
      "lastLoginAt": "2026-01-24T09:15:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1234,
    "totalPages": 25
  }
}
```

---

### List API Keys

```http
GET /dashboard/projects/{projectId}/api-keys
Authorization: Bearer <jwt>
```

**Response 200**:
```json
{
  "data": [
    {
      "id": "01HJAPIKEY...",
      "name": "Production Key",
      "clientId": "pk_abc123...",
      "clientSecretMasked": "sk_***xyz",
      "status": "active",
      "lastUsedAt": "2026-01-24T12:00:00Z",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "meta": {
    "total": 2
  }
}
```

---

### Create API Key

```http
POST /dashboard/projects/{projectId}/api-keys
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "name": "Staging Key"
}
```

**Response 201**:
```json
{
  "data": {
    "id": "01HJNEWKEY...",
    "name": "Staging Key",
    "clientId": "pk_new123...",
    "clientSecret": "sk_FULL_SECRET_SHOWN_ONCE",
    "status": "active",
    "createdAt": "2026-01-24T12:30:00Z"
  },
  "warning": "The client secret is shown only once. Please save it securely."
}
```

---

### Revoke API Key

```http
DELETE /dashboard/projects/{projectId}/api-keys/{keyId}
Authorization: Bearer <jwt>
```

**Response 200**:
```json
{
  "data": {
    "id": "01HJAPIKEY...",
    "status": "revoked",
    "revokedAt": "2026-01-24T12:35:00Z"
  },
  "message": "API key has been revoked"
}
```

**Response 404**:
```json
{
  "error": {
    "code": "not_found",
    "message": "API key not found"
  }
}
```

---

### Refresh Access Token

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 200**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response 401**:
```json
{
  "error": {
    "code": "invalid_refresh_token",
    "message": "Refresh token is invalid or expired"
  }
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `unauthorized` | 401 | Missing or invalid JWT |
| `invalid_refresh_token` | 401 | Refresh token expired or invalid |
| `not_found` | 404 | Resource not found |
| `forbidden` | 403 | User doesn't own this project |
| `validation_error` | 400 | Invalid request parameters |
| `internal_error` | 500 | Unexpected server error |
