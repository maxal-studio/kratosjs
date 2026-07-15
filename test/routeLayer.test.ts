import { SqliteDriver } from '@mikro-orm/sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BaseResource, FormBuilder, TableBuilder, TextColumn, TextInput, Panel } from '../src';
import { adminRoute, requireAuth, optionalAuth, viewAuth, csrfProtection } from '../src';
import { AuthProvider } from '../src/auth/AuthProvider';
import type { AuthUser } from '../src';
import { InMemoryHttpAdapter } from '../src/http/testing';
import { CSRF_COOKIE, VIEW_HEADER, VIEW_LOCATION_HEADER } from '../src/views/protocol';
import { Author } from './entities.sql';

/**
 * The unified panel.route() layer: bare public routes (no prefix, no auth),
 * opt-in middleware (adminRoute / requireAuth / optionalAuth / viewAuth /
 * csrfProtection), and precedence vs panel routes — on the framework-free adapter.
 */

const alice: AuthUser = { id: '1', email: 'alice@example.com', name: 'Alice' };

class TestAuthProvider extends AuthProvider {
	constructor() {
		super({ name: 'test', label: 'Test' });
	}
	async authenticate(credentials: any): Promise<any | null> {
		if (credentials?.email === alice.email && credentials?.password === 'secret') {
			return { ...alice };
		}
		return null;
	}
}

class AuthorResource extends BaseResource {
	static slug = 'authors';
	static entity = Author;
	static label = 'Author';
	static form() {
		return FormBuilder.make().schema([TextInput.make('name'), TextInput.make('email')]);
	}
	static table() {
		return TableBuilder.make().columns([TextColumn.make('name'), TextColumn.make('email')]);
	}
}

const basePath = '/kratosjs/api';
let panel: Panel;
let adapter: InMemoryHttpAdapter;
let baseUrl: string;
let accessToken: string;

beforeAll(async () => {
	adapter = new InMemoryHttpAdapter();
	panel = Panel.make('admin')
		.httpAdapter(adapter)
		.adminClient(false)
		.orm(
			{ driver: SqliteDriver, dbName: ':memory:', entities: [Author], allowGlobalContext: true },
			{ migrate: false, updateSchema: true },
		)
		.resources([AuthorResource])
		.auth({
			jwt: { secret: 'test-secret', accessTokenExpiry: '15m', refreshTokenExpiry: '7d' },
			providers: [new TestAuthProvider()],
			getUserById: async id => (id === alice.id ? alice : null),
		});

	// Bare public route — no auth even though auth is configured.
	panel.route('get', '/hello', (req, reply) => reply.json({ hello: 'world', user: req.authUser?.email ?? null }));

	// Bare route returning HTML.
	panel.route('get', '/page', (_req, reply) => reply.html('<h1>Hi</h1>'));

	// optionalAuth attaches the user when present, never blocks.
	panel.route('get', '/whoami', optionalAuth(panel), (req, reply) =>
		reply.json({ user: req.authUser?.email ?? null }),
	);

	// requireAuth without base-path prefixing.
	panel.route('get', '/secret', requireAuth(panel), (_req, reply) => reply.json({ ok: true }));

	// adminRoute: base-path-prefixed + auth required. Also beats the /:resource pattern.
	panel.route('get', '/authors/special', adminRoute(panel), (_req, reply) => reply.json({ special: true }));

	// viewAuth: browser redirect to login when unauthenticated.
	panel.route('get', '/account', viewAuth(panel), (_req, reply) => reply.json({ account: true }));

	// csrfProtection on a non-GET route.
	panel.route('post', '/submit', csrfProtection(panel), (_req, reply) => reply.json({ submitted: true }));

	// Note: viewAuth's login redirect uses the default loginPath ('/login') — no
	// panel.views() needed, which keeps this test from booting Vite.

	await panel.start(0);
	baseUrl = `http://127.0.0.1:${adapter.getPort()}`;

	const login = await fetch(`${baseUrl}${basePath}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ provider: 'test', email: alice.email, password: 'secret' }),
	});
	const access = login.headers.getSetCookie().find(c => c.startsWith('kratosjs_access_token='))!;
	accessToken = access.split(';')[0].split('=').slice(1).join('=');
});

afterAll(async () => {
	await panel.stop();
	await panel.getOrm().close(true);
});

const bearer = () => ({ Authorization: `Bearer ${decodeURIComponent(accessToken)}` });

describe('panel.route() bare routes', () => {
	it('serves a bare route with no auth at a top-level path', async () => {
		const res = await fetch(`${baseUrl}/hello`);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ hello: 'world', user: null });
	});

	it('serves HTML from a bare route', async () => {
		const res = await fetch(`${baseUrl}/page`);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toContain('text/html');
		expect(await res.text()).toBe('<h1>Hi</h1>');
	});

	it('optionalAuth attaches the user when a token is present', async () => {
		const anon = await fetch(`${baseUrl}/whoami`);
		expect(await anon.json()).toEqual({ user: null });
		const authed = await fetch(`${baseUrl}/whoami`, { headers: bearer() });
		expect(await authed.json()).toEqual({ user: alice.email });
	});
});

describe('opt-in auth middleware', () => {
	it('requireAuth blocks without a token and passes with one', async () => {
		expect((await fetch(`${baseUrl}/secret`)).status).toBe(401);
		expect((await fetch(`${baseUrl}/secret`, { headers: bearer() })).status).toBe(200);
	});

	it('adminRoute prefixes the base path and requires auth', async () => {
		// Not reachable at the bare path…
		expect((await fetch(`${baseUrl}/authors/special`)).status).toBe(404);
		// …reachable (and auth-gated) under the base path.
		expect((await fetch(`${baseUrl}${basePath}/authors/special`)).status).toBe(401);
		const ok = await fetch(`${baseUrl}${basePath}/authors/special`, { headers: bearer() });
		expect(ok.status).toBe(200);
		expect(await ok.json()).toEqual({ special: true });
	});

	it('adminRoute beats the /:resource pattern (registration order wins)', async () => {
		const res = await fetch(`${baseUrl}${basePath}/authors/special`, { headers: bearer() });
		// Would be a 404 "record not found" if the /:resource/:id CRUD route matched.
		expect(await res.json()).toEqual({ special: true });
	});
});

describe('viewAuth', () => {
	it('redirects a browser navigation to the login page when unauthenticated', async () => {
		const res = await fetch(`${baseUrl}/account`, { redirect: 'manual' });
		expect(res.status).toBe(302);
		expect(res.headers.get('location')).toBe(`/login?redirect=${encodeURIComponent('/account')}`);
	});

	it('409s with X-Kratos-Location for a client-router (view) request', async () => {
		const res = await fetch(`${baseUrl}/account`, { headers: { [VIEW_HEADER]: 'true' } });
		expect(res.status).toBe(409);
		expect(res.headers.get(VIEW_LOCATION_HEADER.toLowerCase())).toContain('/login?redirect=');
	});

	it('passes through when authenticated', async () => {
		const res = await fetch(`${baseUrl}/account`, { headers: bearer() });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ account: true });
	});
});

describe('csrfProtection', () => {
	it('rejects a non-GET request without a matching token', async () => {
		const res = await fetch(`${baseUrl}/submit`, { method: 'POST' });
		expect(res.status).toBe(419);
	});

	it('accepts when the cookie and header token match', async () => {
		const token = 'a'.repeat(64);
		const res = await fetch(`${baseUrl}/submit`, {
			method: 'POST',
			headers: { 'X-Kratos-CSRF': token, Cookie: `${CSRF_COOKIE}=${token}` },
		});
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ submitted: true });
	});
});

describe('registerRoute (deprecated) parity', () => {
	it('still registers a base-path-prefixed, auth-gated admin route', () => {
		const routes = panel.getRegisteredRoutes();
		// The first-registered route is the bare /hello (top-level, not prefixed).
		expect(routes).toContainEqual({ method: 'GET', path: '/hello' });
		expect(routes).toContainEqual({ method: 'GET', path: `${basePath}/authors/special` });
	});
});
