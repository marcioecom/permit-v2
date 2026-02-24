/**
 * Configuration for initializing the Permit server SDK
 */
export interface PermitConfig {
  /** Public client ID (pk_...) from Permit dashboard */
  clientId: string;
  /** Secret key (sk_...) - NEVER expose to client */
  clientSecret: string;
  /** Permit API base URL (default: https://api.permit.dev) */
  baseUrl?: string;
  /** JWKS cache TTL in milliseconds (default: 24 hours) */
  cacheTtl?: number;
}

/**
 * User information extracted from a validated JWT token
 */
export interface PermitUser {
  /** Unique user identifier */
  userId: string;
  /** User's email address */
  email: string;
  /** Project/app identifier */
  appId: string;
  /** Environment identifier (present for OAuth-authenticated users) */
  environmentId?: string;
  /** Auth provider: "email", "google", etc. */
  provider: string;
  /** When the token was issued */
  issuedAt: Date;
  /** When the token expires */
  expiresAt: Date;
  /** Custom metadata (future use) */
  metadata?: Record<string, unknown>;
}

/**
 * Result of token verification
 */
export interface VerificationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** User data if token is valid */
  user?: PermitUser;
  /** Human-readable error message if invalid */
  error?: string;
  /** Machine-readable error code if invalid */
  errorCode?: ErrorCode;
}

/**
 * Error codes for token verification failures
 */
export type ErrorCode =
  | 'TOKEN_EXPIRED'
  | 'INVALID_SIGNATURE'
  | 'INVALID_ISSUER'
  | 'INVALID_AUDIENCE'
  | 'MALFORMED_TOKEN'
  | 'JWKS_FETCH_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'CREDENTIALS_REQUIRED';

/**
 * JWT claims structure from Permit tokens
 */
export interface PermitTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  jti?: string;
  email: string;
  uid: string;
  pid: string;
  eid?: string;
  provider: string;
}
