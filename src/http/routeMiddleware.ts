import type { KratosMiddleware } from './types';
import type { Panel } from '../Panel';
import { authMiddleware, optionalAuthMiddleware } from '../auth/middleware';
import type { AdminRouteConfig } from '../views/types';

/**
 * Symbol tagging the {@link adminRoute} marker middleware. `panel.route()` detects it
 * to prefix the route with the API base path and insert the admin auth step.
 */
export const ADMIN_ROUTE_MARKER = Symbol.for('kratosjs.adminRoute');

/**
 * Mark a `panel.route(...)` route as an admin/API route: the path is prefixed with the
 * panel base path and the admin request pipeline (auth + request context) is attached.
 * Spread it into `panel.route`:
 *
 * ```typescript
 * import { adminRoute } from '@maxal_studio/kratosjs';
 * panel.route('post', '/reindex', adminRoute(panel), async (req, reply) => {
 *   // req.authUser is populated; path is `${basePath}/reindex`
 *   reply.json({ ok: true });
 * });
 * ```
 *
 * It is a no-op middleware carrying configuration on {@link ADMIN_ROUTE_MARKER}; the
 * actual auth step and base-path prefix are applied by `panel.route()`.
 */
export function adminRoute(
	_panel: Panel,
	opts?: { auth?: 'required' | 'optional' },
): KratosMiddleware & { [ADMIN_ROUTE_MARKER]: AdminRouteConfig } {
	const marker: KratosMiddleware = async (_req, _reply, next) => next();
	(marker as any)[ADMIN_ROUTE_MARKER] = { auth: opts?.auth ?? 'required' };
	return marker as KratosMiddleware & { [ADMIN_ROUTE_MARKER]: AdminRouteConfig };
}

/** Read the admin-route config off a handler, if it carries the marker. */
export function readAdminRouteMarker(handler: unknown): AdminRouteConfig | undefined {
	if (typeof handler === 'function' && (handler as any)[ADMIN_ROUTE_MARKER]) {
		return (handler as any)[ADMIN_ROUTE_MARKER] as AdminRouteConfig;
	}
	return undefined;
}

/**
 * Require a valid auth token (JSON 401 on failure). Use on a `panel.route(...)` that
 * needs auth but should NOT be base-path-prefixed (unlike {@link adminRoute}).
 */
export function requireAuth(panel: Panel): KratosMiddleware {
	const authManager = panel.getAuthManager();
	if (!authManager) {
		return async (_req, _reply, next) => next();
	}
	return authMiddleware(authManager);
}

/** Attach the authenticated user when a valid token is present; never blocks. */
export function optionalAuth(panel: Panel): KratosMiddleware {
	return optionalAuthMiddleware(panel.getAuthManager());
}
