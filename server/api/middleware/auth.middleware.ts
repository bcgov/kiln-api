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

    // Prioritize body token over header token
    if (bodyToken) {
      token = bodyToken;
    } else if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (authHeader) {
      token = authHeader;
    }

    const username = req.body?.username || req.params?.username || req.cookies?.username;

    const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || '';
    const isLocal = ['local', 'localhost', 'development', 'dev'].includes(environment.toLowerCase());

    if (!isLocal && !token && username) {
      logger.error('Token required in non-local environments', {
        environment,
        username: username || 'none',
        route: req.path,
      });
      res.status(401).json({
        error: 'Token required in non-local environments'
      });
      return;
    }

    if (!token && !username) {
      logger.error('Authentication required', {
        environment,
        route: req.path,
      });
      res.status(401).json({
        error: 'Authentication required: provide either token or username'
      });
      return;
    }

    req.user = {
      token,
      username,
    };

    // Determine username source for debugging
    let usernameSource = 'none';
    if (req.body?.username) usernameSource = 'body';
    else if (req.params?.username) usernameSource = 'params';
    else if (req.cookies?.username) usernameSource = 'cookie';

    logger.debug('Auth extracted', {
      hasToken: !!token,
      username: username || 'anonymous',
      usernameSource,
      environment,
      isLocal,
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
