import { clearJWKSCache } from './auth';
import type {
    ErrorCode,
    PermitConfig,
    PermitUser,
    VerificationResult,
} from './types';
import { verifyToken } from './verify';

/**
 * PermitAuth class for server-side JWT validation.
 *
 * @example
 * ```typescript
 * const permit = new PermitAuth({
 *   clientId: process.env.PERMIT_CLIENT_ID!,
 *   clientSecret: process.env.PERMIT_CLIENT_SECRET!,
 * });
 *
 * const result = await permit.verifyToken(accessToken);
 * if (result.valid) {
 *   console.log(result.user.email);
 * }
 * ```
 */
export class PermitAuth {
  private config: PermitConfig;

  constructor(config: PermitConfig) {
    if (!config.clientId) {
      throw new Error('PermitAuth: clientId is required');
    }
    if (!config.clientSecret) {
      throw new Error('PermitAuth: clientSecret is required');
    }
    this.config = config;
  }

  /**
   * Verify a JWT token and extract user information.
   */
  async verifyToken(token: string): Promise<VerificationResult> {
    return verifyToken(token, this.config);
  }

  /**
   * Clear the cached JWKS keys.
   * Useful for testing or when keys have been rotated.
   */
  clearCache(): void {
    clearJWKSCache();
  }
}

// Export types
export type {
    ErrorCode, PermitConfig,
    PermitUser,
    VerificationResult
};

// Export standalone function for functional style
    export { verifyToken } from './verify';

