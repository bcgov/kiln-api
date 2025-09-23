import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksRsa from 'jwks-rsa';
import l from '../../common/logger';

export interface AuthRequest extends Request {
  user?: {
    username?: string;
    sub?: string;
    email?: string;
    preferred_username?: string;
    [key: string]: any;
  };
  authMethod?: 'keycloak' | 'cookie' | 'bypass';
}

interface AuthConfig {
  enabled: boolean;
  standaloneMode: boolean;
  portalIntegrated: boolean;
  keycloak: {
    enabled: boolean;
    realm: string;
    authServerUrl: string;
    clientId: string;
  };
  cookieFallback: {
    enabled: boolean;
    cookieName: string;
  };
  publicRoutes: string[];
}

const authConfig: AuthConfig = {
  enabled: process.env.AUTH_ENABLED !== 'false',
  standaloneMode: process.env.STANDALONE_MODE === 'true',
  portalIntegrated: process.env.IS_PORTAL_INTEGRATED === 'true',
  keycloak: {
    enabled: process.env.KEYCLOAK_ENABLED !== 'false',
    realm: process.env.KEYCLOAK_REALM || 'standard',
    authServerUrl:
      process.env.KEYCLOAK_AUTH_SERVER_URL ||
      'https://dev.loginproxy.gov.bc.ca/auth',
    clientId: process.env.KEYCLOAK_CLIENT_ID || 'forms-flow-web',
  },
  cookieFallback: {
    enabled: process.env.COOKIE_AUTH_ENABLED !== 'false',
    cookieName: process.env.COOKIE_AUTH_NAME || 'username',
  },
  publicRoutes: [
    '/api/health',
    '/api/status',
    '/api/preview',
    '/api/generateForm',
    '/api-explorer',
  ],
};

let jwksClient: jwksRsa.JwksClient | null = null;

if (authConfig.keycloak.enabled && authConfig.enabled) {
  jwksClient = jwksRsa({
    jwksUri: `${authConfig.keycloak.authServerUrl}/realms/${authConfig.keycloak.realm}/protocol/openid-connect/certs`,
    cache: true,
    cacheMaxAge: 86400000,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
  });
}

async function verifyKeycloakToken(token: string): Promise<any> {
  if (!jwksClient) {
    throw new Error('JWKS client not initialized');
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      async (header, callback) => {
        try {
          const key = await jwksClient!.getSigningKey(header.kid);
          const signingKey = key.getPublicKey();
          callback(null, signingKey);
        } catch (error) {
          callback(error as Error);
        }
      },
      {
        algorithms: ['RS256'],
        issuer: `${authConfig.keycloak.authServerUrl}/realms/${authConfig.keycloak.realm}`,
        audience: authConfig.keycloak.clientId,
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}

function extractCookieUser(req: Request): string | null {
  if (!authConfig.cookieFallback.enabled) {
    return null;
  }

  const cookies = req.cookies;
  const username = cookies?.[authConfig.cookieFallback.cookieName];

  if (username && username.trim().length > 0) {
    return decodeURIComponent(username).trim();
  }

  return null;
}

function isPublicRoute(path: string): boolean {
  return authConfig.publicRoutes.some(
    (publicPath) => path.startsWith(publicPath) || path === publicPath
  );
}

export function createAuthMiddleware(options: { requireAuth?: boolean } = {}) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const requireAuth = options.requireAuth ?? true;

    if (!authConfig.enabled || authConfig.standaloneMode) {
      req.authMethod = 'bypass';
      req.user = { username: 'standalone', sub: 'standalone-user' };
      l.debug('Auth bypassed - standalone mode or auth disabled');
      return next();
    }

    if (authConfig.portalIntegrated) {
      req.authMethod = 'bypass';
      req.user = { username: 'portal', sub: 'portal-user' };
      l.debug('Auth bypassed - portal integrated mode');
      return next();
    }

    const path = req.path;
    if (isPublicRoute(path)) {
      l.debug(`Public route accessed: ${path}`);
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);

        if (authConfig.keycloak.enabled) {
          try {
            const decoded = await verifyKeycloakToken(token);
            req.authMethod = 'keycloak';
            req.user = {
              sub: decoded.sub,
              username: decoded.preferred_username || decoded.sub,
              email: decoded.email,
              preferred_username: decoded.preferred_username,
              ...decoded,
            };
            l.debug(`Keycloak auth successful for user: ${req.user.username}`);
            return next();
          } catch (error) {
            l.warn('Keycloak token verification failed:', error);
          }
        }
      }

      const cookieUser = extractCookieUser(req);
      if (cookieUser) {
        req.authMethod = 'cookie';
        req.user = {
          username: cookieUser,
          sub: `cookie-${cookieUser}`,
        };
        l.debug(`Cookie auth successful for user: ${cookieUser}`);
        return next();
      }

      const usernameHeader = req.headers['x-username'] as string;
      if (usernameHeader) {
        req.authMethod = 'cookie';
        req.user = {
          username: usernameHeader,
          sub: `header-${usernameHeader}`,
        };
        l.debug(`Username header auth successful for user: ${usernameHeader}`);
        return next();
      }

      if (!requireAuth) {
        l.debug('No auth found but not required for this route');
        return next();
      }

      l.warn('Authentication required but no valid auth method found');
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    } catch (error) {
      l.error('Auth middleware error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication processing failed',
      });
    }
  };
}

export const authMiddleware = createAuthMiddleware();
export const optionalAuthMiddleware = createAuthMiddleware({
  requireAuth: false,
});
