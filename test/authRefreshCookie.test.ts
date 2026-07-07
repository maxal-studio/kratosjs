import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { AuthManager } from '../src';
import type { AuthUser } from '../src';

/**
 * Regression: the refresh-token cookie MUST be scoped to the path where the auth router is
 * actually mounted (`${basePath}/auth/refresh`), not a bare `/auth/refresh`.
 *
 * The panel mounts the whole router under a base path (default `/kratosjs/api`), so the real
 * refresh endpoint is `/kratosjs/api/auth/refresh`. A cookie set with `Path=/auth/refresh`
 * is never returned by the browser for that URL, so every silent refresh failed and the user
 * got logged out the moment the 15-minute access token expired.
 */

const jwtConfig = { secret: 'test-secret', accessTokenExpiry: '15m', refreshTokenExpiry: '7d' };
const basePath = '/kratosjs/api';
const alice: AuthUser = { id: '1', email: 'alice@example.com', name: 'Alice' };

let server: Server;
let baseUrl: string;

beforeAll(async () => {
	const mgr = new AuthManager(jwtConfig);
	const getUserById = async (id: string): Promise<AuthUser | null> => (id === alice.id ? alice : null);

	const app = express();
	app.use(cookieParser());
	app.use(express.json());
	// Mount exactly the way the panel does: the auth router lives at `${basePath}/auth`.
	app.use(
		`${basePath}/auth`,
		mgr.getRoutes(getUserById, () => undefined, basePath),
	);

	server = await new Promise<Server>(resolve => {
		const s = app.listen(0, () => resolve(s));
	});
	const { port } = server.address() as AddressInfo;
	baseUrl = `http://127.0.0.1:${port}`;

	// Seed a valid refresh token (as login would) to drive the refresh endpoint.
	refreshToken = mgr.generateTokens(alice).refreshToken;
});

afterAll(() => {
	server?.close();
});

let refreshToken: string;

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
});
