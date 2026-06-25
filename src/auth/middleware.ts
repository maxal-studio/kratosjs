import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthManager } from './AuthManager';
// Import request types to ensure declaration merging is applied
import '../panel/request';
import { t } from '../i18n/serverT';

/**
 * Extract token from request (header or cookie)
 */
function extractToken(req: Request): string | null {
	// Try Authorization header first
	const authHeader = req.headers.authorization;
	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	// Try cookie
	if (req.cookies && req.cookies['kratosjs_access_token']) {
		return req.cookies['kratosjs_access_token'];
	}

	return null;
}

/**
 * Authentication middleware - requires valid token
 * Attaches user to req.authUser
 */
export function authMiddleware(authManager: AuthManager): RequestHandler {
	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
		try {
			const token = extractToken(req);
			if (!token) {
				res.status(401).json({ error: t('core:auth.unauthorized_no_token') });
				return;
			}

			const user = await authManager.getCurrentUser(token);
			if (!user) {
				res.status(401).json({ error: t('core:auth.unauthorized_invalid_token') });
				return;
			}

			req.authUser = user;
			next();
		} catch (error: any) {
			res.status(401).json({ error: error.message || 'Authentication failed' });
		}
	};
}

/**
 * Optional authentication middleware - attaches user if token is valid
 * Does not block request if no token or invalid token
 */
export function optionalAuthMiddleware(authManager?: AuthManager): RequestHandler {
	return async (req: Request, _res: Response, next: NextFunction) => {
		try {
			if (!authManager) {
				next();
				return;
			}
			const token = extractToken(req);
			if (token) {
				const user = await authManager.getCurrentUser(token);
				if (user) {
					req.authUser = user;
				}
			}
		} catch (error) {
			// Silently fail - optional auth
		}
		next();
	};
}
