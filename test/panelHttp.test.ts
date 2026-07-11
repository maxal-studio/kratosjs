import { SqliteDriver } from '@mikro-orm/sqlite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { BaseResource, FormBuilder, TableBuilder, TextColumn, TextInput, Panel, getRequestContext } from '../src';
import { AuthProvider } from '../src/auth/AuthProvider';
import type { AuthUser } from '../src';
import { InMemoryHttpAdapter } from '../src/http/testing';
import { Author } from './entities.sql';

/**
 * End-to-end Panel boot on the framework-free InMemoryHttpAdapter.
 * Exercises the whole v2 HTTP stack: route buffering, start() orchestration
 * (init → static → routes → listen), the composed pipeline (orm/locale/auth/
 * resource/context), auth cookies, and custom-route precedence + semantics.
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
		return FormBuilder.make().schema([
			TextInput.make('name').label('Name'),
			TextInput.make('email').label('Email'),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('name').label('Name'),
			TextColumn.make('email').label('Email'),
		]);
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
		.i18n({ locales: ['en', 'sq'], defaultLocale: 'en' })
		.orm(
			{
				driver: SqliteDriver,
				dbName: ':memory:',
				entities: [Author],
				allowGlobalContext: true,
			},
			{ migrate: false, updateSchema: true },
		)
		.resources([AuthorResource])
		.auth({
			jwt: { secret: 'test-secret', accessTokenExpiry: '15m', refreshTokenExpiry: '7d' },
			providers: [new TestAuthProvider()],
			getUserById: async id => (id === alice.id ? alice : null),
		});

	// Custom route registered BEFORE start — must beat the /:resource pattern.
	panel.registerRoute('get', '/greet', (req, reply) => {
		reply.json({
			hello: (req.query.name as string) || 'there',
			user: req.authUser?.email ?? null,
			locale: getRequestContext()?.activeLocale ?? null,
		});
	});

	await panel.start(0);
	baseUrl = `http://127.0.0.1:${adapter.getPort()}`;

	const login = await fetch(`${baseUrl}${basePath}/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ provider: 'test', email: alice.email, password: 'secret' }),
	});
	expect(login.status).toBe(200);

	// Cookie contract: access cookie site-wide, refresh cookie scoped to the endpoint.
	const setCookie = login.headers.getSetCookie();
	const access = setCookie.find(c => c.startsWith('kratosjs_access_token='))!;
	const refresh = setCookie.find(c => c.startsWith('kratosjs_refresh_token='))!;
	expect(access).toContain('Path=/');
	expect(refresh).toContain(`Path=${basePath}/auth/refresh`);

	accessToken = access.split(';')[0].split('=').slice(1).join('=');
});

afterAll(async () => {
	await panel.stop();
	await panel.getOrm().close(true);
});

const authed = () => ({ Authorization: `Bearer ${decodeURIComponent(accessToken)}` });

describe('Panel on InMemoryHttpAdapter', () => {
	it('serves /meta with optional auth (no token needed)', async () => {
		const res = await fetch(`${baseUrl}${basePath}/meta`);
		expect(res.status).toBe(200);
		const meta = await res.json();
		expect(meta.resources.some((r: any) => r.slug === 'authors')).toBe(true);
	});

	it('requires auth on custom routes when auth is configured (v1 parity)', async () => {
		const res = await fetch(`${baseUrl}${basePath}/greet`);
		expect(res.status).toBe(401);
	});

	it('custom route beats the /:resource pattern, sees user, query, and locale context', async () => {
		const res = await fetch(`${baseUrl}${basePath}/greet?name=Dajan&locale=sq`, { headers: authed() });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ hello: 'Dajan', user: alice.email, locale: 'sq' });
	});

	it('performs CRUD through the composed pipeline', async () => {
		const create = await fetch(`${baseUrl}${basePath}/authors`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authed() },
			body: JSON.stringify({ name: 'Bob', email: 'bob@example.com' }),
		});
		expect(create.status).toBe(201);
		expect(create.headers.get('X-KratosJs-Refresh-Badges')).toBe('true');
		const created = await create.json();
		// resource.create() returns { data, message }, wrapped again by the controller
		expect(created.data.data.name).toBe('Bob');

		const list = await fetch(`${baseUrl}${basePath}/authors/list`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authed() },
			body: JSON.stringify({ page: 1, perPage: 10 }),
		});
		expect(list.status).toBe(200);
		const rows = await list.json();
		expect(rows.data.some((row: any) => row.email === 'bob@example.com')).toBe(true);
	});

	it('404s unknown resources through resolveResource', async () => {
		const res = await fetch(`${baseUrl}${basePath}/nope/list`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', ...authed() },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(404);
	});

	it('refreshes the session from the scoped refresh cookie', async () => {
		const login = await fetch(`${baseUrl}${basePath}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ provider: 'test', email: alice.email, password: 'secret' }),
		});
		const refreshCookie = login.headers.getSetCookie().find(c => c.startsWith('kratosjs_refresh_token='))!;
		const refreshToken = refreshCookie.split(';')[0];

		const res = await fetch(`${baseUrl}${basePath}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Cookie: refreshToken },
			body: JSON.stringify({}),
		});
		expect(res.status).toBe(200);
		expect((await res.json()).tokens.expiresIn).toBeGreaterThan(0);
	});

	it('reports the exact route table: custom routes first, then panel routes', async () => {
		const routes = panel.getRegisteredRoutes();
		expect(routes[0]).toEqual({ method: 'GET', path: `${basePath}/greet` });
		expect(routes).toContainEqual({ method: 'GET', path: `${basePath}/meta` });
		expect(routes).toContainEqual({ method: 'POST', path: `${basePath}/auth/login` });
		expect(routes).toContainEqual({ method: 'POST', path: `${basePath}/:resource/list` });
	});
});

describe('Panel with a custom panelPath', () => {
	let p: Panel;
	let a: InMemoryHttpAdapter;
	let url: string;

	beforeAll(async () => {
		a = new InMemoryHttpAdapter();
		p = Panel.make('admin')
			.httpAdapter(a)
			.adminClient(false)
			.panelPath('/admin/') // trailing slash normalizes to '/admin'
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

		await p.start(0);
		url = `http://127.0.0.1:${a.getPort()}`;
	});

	afterAll(async () => {
		await p.stop();
		await p.getOrm().close(true);
	});

	it('normalizes the panel path (trailing slash stripped)', () => {
		expect(p.getPanelPath()).toBe('/admin');
	});

	it('leaves the API path independent and reachable', async () => {
		const res = await fetch(`${url}/kratosjs/api/meta`);
		expect(res.status).toBe(200);
		expect((await res.json()).resources.some((r: any) => r.slug === 'authors')).toBe(true);
	});

	it("leaves the root free (panelPath does not take over '/')", async () => {
		// With the UI scoped to /admin, an unmatched root GET 404s instead of being
		// swallowed by the SPA — the app is free to serve '/' via the raw adapter instance.
		const res = await fetch(`${url}/`);
		expect(res.status).toBe(404);
	});

	it('still logs in (auth unaffected by the UI path)', async () => {
		const res = await fetch(`${url}/kratosjs/api/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ provider: 'test', email: alice.email, password: 'secret' }),
		});
		expect(res.status).toBe(200);
		expect((await res.json()).status).toBe('authenticated');
	});
});
