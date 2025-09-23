import { Request, Response, NextFunction } from 'express';
import l from '../../common/logger';

export interface UserRequest extends Request {
  user?: {
    username?: string;
    email?: string;
    [key: string]: any;
  };
}

export function userExtractionMiddleware(
  req: UserRequest,
  _res: Response,
  next: NextFunction
): void {
  try {
    // Extract user info from headers set by the gateway/route
    const username = req.headers['x-username'] as string;
    const email = req.headers['x-email'] as string;
    const userId = req.headers['x-user-id'] as string;

    // Also check for username in cookies as fallback
    const cookieUsername = req.cookies?.username;

    if (username || cookieUsername) {
      req.user = {
        username: username || cookieUsername,
        email,
        userId,
      };
      l.debug(`User extracted: ${req.user.username}`);
    }

    // Extract token if provided (for downstream services)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      req.headers['x-auth-token'] = authHeader;
    }

    next();
  } catch (error) {
    l.error('User extraction error:', error);
    // Don't fail the request, just continue without user info
    next();
  }
}

export default userExtractionMiddleware;
