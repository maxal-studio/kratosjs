import type { CookieOptions } from './types';

/**
 * Serialize a Set-Cookie header value (RFC 6265).
 * `maxAge` arrives in milliseconds (Express convention) and is emitted in seconds.
 */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
	const parts = [`${name}=${encodeURIComponent(value)}`];

	if (options.maxAge !== undefined) {
		parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
	}
	if (options.expires) {
		parts.push(`Expires=${options.expires.toUTCString()}`);
	}
	if (options.path) {
		parts.push(`Path=${options.path}`);
	}
	if (options.domain) {
		parts.push(`Domain=${options.domain}`);
	}
	if (options.httpOnly) {
		parts.push('HttpOnly');
	}
	if (options.secure) {
		parts.push('Secure');
	}
	if (options.sameSite) {
		const label = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);
		parts.push(`SameSite=${label}`);
	}

	return parts.join('; ');
}

/**
 * Serialize a Set-Cookie header value that expires the cookie immediately.
 * Path/domain must match the original cookie for browsers to drop it.
 */
export function serializeClearCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): string {
	return serializeCookie(name, '', {
		...options,
		expires: new Date(0),
	});
}

/**
 * Parse a Cookie request header into a name→value map.
 * Replaces the cookie-parser dependency: adapters never parse cookies themselves.
 */
export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
	const cookies: Record<string, string> = {};
	if (!cookieHeader) {
		return cookies;
	}

	for (const pair of cookieHeader.split(';')) {
		const eq = pair.indexOf('=');
		if (eq === -1) {
			continue;
		}
		const name = pair.slice(0, eq).trim();
		if (!name || name in cookies) {
			continue; // first occurrence wins, like cookie-parser
		}
		let value = pair.slice(eq + 1).trim();
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1);
		}
		try {
			cookies[name] = decodeURIComponent(value);
		} catch {
			cookies[name] = value;
		}
	}

	return cookies;
}
