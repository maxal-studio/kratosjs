import type { KratosMiddleware, KratosRequest } from '../http/types';
import { AuthManager } from './AuthManager';
import { t } from '../i18n/serverT';

/**
 * Extract token from request (Authorization header or access-token cookie)
 */
function extractToken(req: KratosRequest): string | null {
	// Try Authorization header first
	const authHeader = req.header('authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		return authHeader.substring(7);
	}

	// Try cookie
	if (req.cookies['kratosjs_access_token']) {
		return req.cookies['kratosjs_access_token'];
	}

	return null;
}

/**
 * Authentication pipeline step - requires a valid token.
 * Attaches the user to req.authUser; responds 401 (without continuing) otherwise.
 */
export function authMiddleware(authManager: AuthManager): KratosMiddleware {
	return async (req, reply, next) => {
		// Guard ONLY the token validation: errors thrown downstream (controllers)
		// must propagate to the pipeline's handleError, not become a 401 here.
		try {
			const token = extractToken(req);
			if (!token) {
				reply.status(401).json({ error: t('core:auth.unauthorized_no_token') });
				return;
			}

			const user = await authManager.getCurrentUser(token);
			if (!user) {
				reply.status(401).json({ error: t('core:auth.unauthorized_invalid_token') });
				return;
			}

			req.authUser = user;
		} catch (error: any) {
			reply.status(401).json({ error: error.message || 'Authentication failed' });
			return;
		}

		await next();
	};
}

/**
 * Optional authentication step - attaches the user when the token is valid,
 * but never blocks the request.
 */
export function optionalAuthMiddleware(authManager?: AuthManager): KratosMiddleware {
	return async (req, _reply, next) => {
		try {
			if (authManager) {
				const token = extractToken(req);
				if (token) {
					const user = await authManager.getCurrentUser(token);
					if (user) {
						req.authUser = user;
					}
				}
			}
		} catch {
			// Silently fail - optional auth
		}
		await next();
	};
}
