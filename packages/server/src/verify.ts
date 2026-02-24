import { errors, jwtVerify } from 'jose';
import { getJWKS } from './auth';
import type {
    PermitConfig,
    PermitTokenClaims,
    PermitUser,
    VerificationResult
} from './types';

const DEFAULT_ISSUER = 'permit';

/**
 * Verify a JWT token and extract user information.
 */
export async function verifyToken(
  token: string,
  config: PermitConfig
): Promise<VerificationResult> {
  // Validate configuration
  if (!config.clientId || !config.clientSecret) {
    return {
      valid: false,
      error: 'Missing clientId or clientSecret',
      errorCode: 'CREDENTIALS_REQUIRED',
    };
  }

  try {
    const jwks = getJWKS(config);

    const { payload } = await jwtVerify(token, jwks, {
      issuer: DEFAULT_ISSUER,
    });

    const claims = payload as unknown as PermitTokenClaims;

    const user: PermitUser = {
      userId: claims.uid || claims.sub,
      email: claims.email,
      appId: claims.pid,
      environmentId: claims.eid || undefined,
      provider: claims.provider,
      issuedAt: new Date((claims.iat || 0) * 1000),
      expiresAt: new Date((claims.exp || 0) * 1000),
    };

    return { valid: true, user };
  } catch (err) {
    return handleVerificationError(err);
  }
}

function handleVerificationError(err: unknown): VerificationResult {
  if (err instanceof errors.JWTExpired) {
    return {
      valid: false,
      error: 'Token has expired',
      errorCode: 'TOKEN_EXPIRED',
    };
  }

  if (err instanceof errors.JWTClaimValidationFailed) {
    const claim = err.claim;
    if (claim === 'iss') {
      return {
        valid: false,
        error: 'Invalid token issuer',
        errorCode: 'INVALID_ISSUER',
      };
    }
    if (claim === 'aud') {
      return {
        valid: false,
        error: 'Invalid token audience',
        errorCode: 'INVALID_AUDIENCE',
      };
    }
  }

  if (err instanceof errors.JWSSignatureVerificationFailed) {
    return {
      valid: false,
      error: 'Invalid token signature',
      errorCode: 'INVALID_SIGNATURE',
    };
  }

  if (err instanceof errors.JWSInvalid || err instanceof errors.JWTInvalid) {
    return {
      valid: false,
      error: 'Malformed token',
      errorCode: 'MALFORMED_TOKEN',
    };
  }

  // Handle fetch errors (JWKS fetch failed)
  if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
    return {
      valid: false,
      error: 'Failed to fetch JWKS keys',
      errorCode: 'JWKS_FETCH_FAILED',
    };
  }

  // Check for 401 from JWKS endpoint
  if (
    err instanceof Error &&
    err.message.includes('401')
  ) {
    return {
      valid: false,
      error: 'Invalid API credentials',
      errorCode: 'INVALID_CREDENTIALS',
    };
  }

  // Unknown error
  const message = err instanceof Error ? err.message : 'Unknown error';
  return {
    valid: false,
    error: `Token verification failed: ${message}`,
    errorCode: 'MALFORMED_TOKEN',
  };
}
