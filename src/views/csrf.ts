import crypto from 'crypto';

/**
 * CSRF protection for non-GET view routes (double-submit cookie pattern).
 *
 * View routes live at top-level public paths and authenticate via the
 * `kratosjs_access_token` cookie, so a cross-site POST would otherwise ride the
 * user's cookie. On the first HTML render the server mints a token into a
 * non-httpOnly cookie; the client router echoes it in the `X-Kratos-CSRF` header
 * and the server verifies the two match with a timing-safe comparison.
 */
export function mintCsrfToken(): string {
	return crypto.randomBytes(32).toString('hex');
}

/** Timing-safe equality of the cookie token and the header token. */
export function verifyCsrfToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
	if (!cookieToken || !headerToken) {
		return false;
	}
	const a = Buffer.from(cookieToken);
	const b = Buffer.from(headerToken);
	if (a.length !== b.length) {
		return false;
	}
	return crypto.timingSafeEqual(a, b);
}
