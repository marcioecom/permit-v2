import { PermitAuth, type PermitConfig, type PermitUser } from '../index';

export interface WithPermitAuthConfig extends PermitConfig {
  /** Header name for the token (default: 'authorization') */
  headerName?: string;
  /** Token prefix to strip (default: 'Bearer ') */
  tokenPrefix?: string;
}

export interface PermitAuthContext {
  user: PermitUser;
}

type NextRequest = {
  headers: {
    get(name: string): string | null;
  };
};

type NextResponse = {
  json(data: unknown, init?: { status?: number }): Response;
};

/**
 * Wrap a Next.js App Router route handler with Permit authentication.
 *
 * @example
 * ```typescript
 * // app/api/protected/route.ts
 * import { withPermitAuth } from '@permitdev/server/next';
 *
 * export const GET = withPermitAuth(async (req, { user }) => {
 *   return Response.json({ message: `Hello ${user.email}` });
 * }, {
 *   clientId: process.env.PERMIT_CLIENT_ID!,
 *   clientSecret: process.env.PERMIT_CLIENT_SECRET!,
 * });
 * ```
 */
export function withPermitAuth<T extends NextRequest>(
  handler: (req: T, context: PermitAuthContext) => Promise<Response> | Response,
  config: WithPermitAuthConfig
): (req: T) => Promise<Response> {
  const permit = new PermitAuth(config);
  const headerName = config.headerName || 'authorization';
  const tokenPrefix = config.tokenPrefix ?? 'Bearer ';

  return async (req: T): Promise<Response> => {
    const authHeader = req.headers.get(headerName);

    if (!authHeader) {
      return Response.json(
        { error: 'Missing authorization header', code: 'MISSING_TOKEN' },
        { status: 401 }
      );
    }

    let token = authHeader;
    if (tokenPrefix && authHeader.startsWith(tokenPrefix)) {
      token = authHeader.slice(tokenPrefix.length);
    }

    const result = await permit.verifyToken(token);

    if (!result.valid || !result.user) {
      return Response.json(
        {
          error: result.error || 'Invalid token',
          code: result.errorCode || 'INVALID_TOKEN',
        },
        { status: 401 }
      );
    }

    return handler(req, { user: result.user });
  };
}

// Re-export types for convenience
export type { PermitConfig, PermitUser } from '../index';
