import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { PermitAuth, type PermitConfig, type PermitUser } from '../index';

export interface PermitMiddlewareConfig extends PermitConfig {
  /** Custom error handler */
  onError?: (res: Response, error: { message: string; code: string }) => void;
  /** Header name for the token (default: 'authorization') */
  headerName?: string;
  /** Token prefix to strip (default: 'Bearer ') */
  tokenPrefix?: string;
}

declare global {
  namespace Express {
    interface Request {
      permitUser?: PermitUser;
    }
  }
}

/**
 * Create Express middleware for Permit token validation.
 *
 * @example
 * ```typescript
 * import { createPermitMiddleware } from '@permitdev/server/middleware';
 *
 * app.use('/api/protected', createPermitMiddleware({
 *   clientId: process.env.PERMIT_CLIENT_ID!,
 *   clientSecret: process.env.PERMIT_CLIENT_SECRET!,
 * }));
 *
 * app.get('/api/protected/me', (req, res) => {
 *   res.json({ user: req.permitUser });
 * });
 * ```
 */
export function createPermitMiddleware(
  config: PermitMiddlewareConfig
): RequestHandler {
  const permit = new PermitAuth(config);
  const headerName = config.headerName || 'authorization';
  const tokenPrefix = config.tokenPrefix ?? 'Bearer ';

  const defaultErrorHandler = (
    res: Response,
    error: { message: string; code: string }
  ) => {
    res.status(401).json({ error: error.message, code: error.code });
  };

  const onError = config.onError || defaultErrorHandler;

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers[headerName.toLowerCase()];

    if (!authHeader || typeof authHeader !== 'string') {
      onError(res, { message: 'Missing authorization header', code: 'MISSING_TOKEN' });
      return;
    }

    let token = authHeader;
    if (tokenPrefix && authHeader.startsWith(tokenPrefix)) {
      token = authHeader.slice(tokenPrefix.length);
    }

    const result = await permit.verifyToken(token);

    if (!result.valid) {
      onError(res, {
        message: result.error || 'Invalid token',
        code: result.errorCode || 'INVALID_TOKEN',
      });
      return;
    }

    req.permitUser = result.user;
    next();
  };
}
