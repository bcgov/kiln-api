import { Request, Response, NextFunction } from 'express';
import logger from '../../common/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    token?: string;
    username?: string;
  };
}

export function extractAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;
    const bodyToken = req.body?.token;

    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    } else if (bodyToken) {
      token = bodyToken;
    }

    const username = req.body?.username || req.params?.username;

    req.user = {
      token,
      username,
    };

    logger.debug('Auth extracted', {
      hasToken: !!token,
      username: username || 'anonymous',
      route: req.path,
    });

    next();
  } catch (error) {
    logger.error('Error extracting auth:', error);
    res.status(500).json({ error: 'Authentication processing failed' });
  }
}

export function validateAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    logger.warn('No user context found, running extractAuth first');
    return extractAuth(req, res, next);
  }

  next();
}

export function getAuthToken(req: AuthenticatedRequest): string | undefined {
  return req.user?.token;
}

export function getUsername(req: AuthenticatedRequest): string | undefined {
  return req.user?.username;
}
