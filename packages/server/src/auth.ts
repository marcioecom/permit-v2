import { createRemoteJWKSet, type JWTVerifyGetKey } from 'jose';
import type { PermitConfig } from './types';

const DEFAULT_BASE_URL = 'https://api.permit.dev';
const DEFAULT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/** Cached JWKS getters by base URL + credentials */
const jwksCache = new Map<string, JWTVerifyGetKey>();

/**
 * Get or create a JWKS getter for the given configuration.
 * Uses Basic Auth with clientId:clientSecret.
 */
export function getJWKS(config: PermitConfig): JWTVerifyGetKey {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  const cacheKey = `${baseUrl}:${config.clientId}`;

  const cached = jwksCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const jwksUrl = new URL('/.well-known/jwks.json', baseUrl);

  // Create Basic Auth header
  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString('base64');

  const jwks = createRemoteJWKSet(jwksUrl, {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
    cacheMaxAge: config.cacheTtl || DEFAULT_CACHE_TTL,
  });

  jwksCache.set(cacheKey, jwks);
  return jwks;
}

/**
 * Clear the JWKS cache (useful for testing or key rotation)
 */
export function clearJWKSCache(): void {
  jwksCache.clear();
}
