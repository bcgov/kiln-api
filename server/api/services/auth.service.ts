import { AuthRequest } from '../middlewares/auth.middleware';
import l from '../../common/logger';

export interface AuthContext {
  username?: string;
  userId?: string;
  email?: string;
  token?: string;
  authMethod?: 'keycloak' | 'cookie' | 'bypass';
}

class AuthService {
  extractAuthContext(req: AuthRequest): AuthContext {
    const context: AuthContext = {
      authMethod: req.authMethod,
    };

    if (req.user) {
      context.username = req.user.username || req.user.preferred_username;
      context.userId = req.user.sub;
      context.email = req.user.email;
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      context.token = authHeader.substring(7);
    }

    const usernameHeader = req.headers['x-username'] as string;
    if (usernameHeader && !context.username) {
      context.username = usernameHeader;
    }

    l.debug('Auth context extracted:', {
      username: context.username,
      userId: context.userId,
      authMethod: context.authMethod,
    });

    return context;
  }

  getAuthHeaders(context: AuthContext): Record<string, string> {
    const headers: Record<string, string> = {};

    if (context.token) {
      headers['Authorization'] = `Bearer ${context.token}`;
    }

    if (context.username) {
      headers['X-Username'] = context.username;
    }

    if (context.userId) {
      headers['X-User-Id'] = context.userId;
    }

    return headers;
  }

  isAuthenticated(context: AuthContext): boolean {
    return !!(context.username || context.userId);
  }

  hasRole(_context: AuthContext, _role: string): boolean {
    return true;
  }

  canAccess(context: AuthContext, resource: string, action: string): boolean {
    if (context.authMethod === 'bypass') {
      return true;
    }

    if (!this.isAuthenticated(context)) {
      return false;
    }

    l.debug(
      `Access check for ${context.username} - resource: ${resource}, action: ${action}`
    );
    return true;
  }
}

export default new AuthService();
