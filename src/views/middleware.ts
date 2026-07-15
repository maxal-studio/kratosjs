import type { KratosMiddleware } from '../http/types';
import type { Panel } from '../Panel';
import { optionalAuthMiddleware } from '../auth/middleware';
import { t } from '../i18n/serverT';
import { CSRF_COOKIE, CSRF_HEADER, VIEW_HEADER, VIEW_LOCATION_HEADER } from './protocol';
import { verifyCsrfToken } from './csrf';

/**
 * HTML-aware auth for protected view pages. Unlike {@link requireAuth} (which always
 * 401s JSON), a browser navigation is redirected to the login page while a
 * client-router (view XHR) request gets a 409 with `X-Kratos-Location` so the router
 * can hard-navigate. `onAuthFailure: 'json'` opts back into a plain 401.
 *
 * ```typescript
 * panel.route('get', '/dashboard', viewAuth(panel), (req, reply) =>
 *   reply.view('Dashboard', { user: req.authUser }));
 * ```
 */
export function viewAuth(panel: Panel, opts?: { onAuthFailure?: 'redirect' | 'json' }): KratosMiddleware {
	const onAuthFailure = opts?.onAuthFailure ?? 'redirect';
	return async (req, reply, next) => {
		const authManager = panel.getAuthManager();
		try {
			await optionalAuthMiddleware(authManager)(req, reply, async () => {});
		} catch {
			// treat as unauthenticated
		}

		if (req.authUser) {
			await next();
			return;
		}

		if (onAuthFailure === 'json') {
			reply.status(401).json({ error: t('core:auth.unauthorized_no_token') });
			return;
		}

		const loginPath = panel.getResolvedViewsConfig().loginPath;
		const target = `${loginPath}?redirect=${encodeURIComponent(req.url)}`;
		if (req.header(VIEW_HEADER) === 'true') {
			reply.status(409).header(VIEW_LOCATION_HEADER, target).json({ location: target });
		} else {
			reply.redirect(target, 302);
		}
	};
}

/**
 * CSRF protection (double-submit cookie) for non-GET routes. Verifies the
 * `kratosjs_csrf` cookie against the `X-Kratos-CSRF` header. Add it to mutating
 * view routes; the Views client router sends the header automatically.
 */
export function csrfProtection(_panel: Panel): KratosMiddleware {
	return async (req, reply, next) => {
		const method = req.method.toUpperCase();
		if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
			await next();
			return;
		}
		if (!verifyCsrfToken(req.cookies[CSRF_COOKIE], req.header(CSRF_HEADER))) {
			reply.status(419).json({ error: t('core:auth.csrf_mismatch') });
			return;
		}
		await next();
	};
}
