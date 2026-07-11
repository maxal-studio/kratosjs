import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthManager } from '../src';
import type { AuthUser } from '../src';
import { InMemoryHttpAdapter, createStubPanel } from '../src/http/testing';

/**
 * Regression: the refresh-token cookie MUST be scoped to the path where the auth routes are
 * actually mounted (`${basePath}/auth/refresh`), not a bare `/auth/refresh`.
 *
 * The panel mounts auth routes under a base path (default `/kratosjs/api`), so the real
 * refresh endpoint is `/kratosjs/api/auth/refresh`. A cookie set with `Path=/auth/refresh`
 * is never returned by the browser for that URL, so every silent refresh failed and the user
 * got logged out the moment the 15-minute access token expired.
 *
 * v2: cookies are serialized by core and the routes come from getRouteDefinitions, so this
 * runs against the framework-free InMemoryHttpAdapter — no express involved.
 */

const jwtConfig = { secret: 'test-secret', accessTokenExpiry: '15m', refreshTokenExpiry: '7d' };
const basePath = '/kratosjs/api';
const alice: AuthUser = { id: '1', email: 'alice@example.com', name: 'Alice' };

let adapter: InMemoryHttpAdapter;
let baseUrl: string;
let refreshToken: string;

beforeAll(async () => {
	const mgr = new AuthManager(jwtConfig);
	const getUserById = async (id: string): Promise<AuthUser | null> => (id === alice.id ? alice : null);

	adapter = new InMemoryHttpAdapter();
	adapter.init({
		panel: createStubPanel(basePath),
		basePath,
		bodyLimit: '1mb',
		cors: { origin: true, credentials: true },
	});

	// Mount exactly the way the panel does: auth routes live at `${basePath}/auth`.
	for (const route of mgr.getRouteDefinitions(getUserById, () => undefined, basePath)) {
		adapter.registerRoute({
			method: route.method,
			path: `${basePath}/auth${route.path}`,
			handler: route.handler,
			source: 'auth',
		});
	}

	await adapter.listen(0);
	baseUrl = `http://127.0.0.1:${adapter.getPort()}`;

	// Seed a valid refresh token (as login would) to drive the refresh endpoint.
	refreshToken = mgr.generateTokens(alice).refreshToken;
});

afterAll(async () => {
	await adapter.close();
});

/** Parse the Path attribute of a specific cookie out of a Set-Cookie header list. */
function cookiePath(setCookie: string[], name: string): string | undefined {
	const line = setCookie.find(c => c.startsWith(`${name}=`));
	return line?.match(/Path=([^;]+)/i)?.[1];
}

describe('refresh-token cookie scoping', () => {
	it('scopes the refresh cookie to the mounted refresh endpoint', async () => {
		const res = await fetch(`${baseUrl}${basePath}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken }),
		});

		expect(res.status).toBe(200);

		const setCookie = res.headers.getSetCookie();
		// The access cookie stays site-wide so every API call carries it.
		expect(cookiePath(setCookie, 'kratosjs_access_token')).toBe('/');
		// The refresh cookie must match the URL the client POSTs to — otherwise it is never sent.
		expect(cookiePath(setCookie, 'kratosjs_refresh_token')).toBe(`${basePath}/auth/refresh`);
	});

	it('accepts the refresh token from the scoped cookie (round trip)', async () => {
		const res = await fetch(`${baseUrl}${basePath}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Cookie: `kratosjs_refresh_token=${refreshToken}`,
			},
			body: JSON.stringify({}),
		});

		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.tokens.expiresIn).toBeGreaterThan(0);
	});
});
