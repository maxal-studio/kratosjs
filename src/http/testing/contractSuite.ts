import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Panel } from '../../Panel';
import type { KratosHttpAdapter } from '../KratosHttpAdapter';
import type { KratosMiddleware } from '../types';
import { composeHandler } from '../pipeline';
import { AdminSpaService } from '../adminSpa';
import { ValidationError } from '../../resource/types';

/**
 * The test-runner primitives the suite needs, injected by the calling test file.
 * This module must NOT import vitest itself: it ships compiled to CommonJS, and
 * vitest cannot be require()d — the consumer's (ESM-transformed) test file passes
 * its own imports in instead.
 */
export interface ContractSuiteTestTools {
	describe: (name: string, fn: () => void) => void;
	it: (name: string, fn: () => void | Promise<void>) => void;
	beforeAll: (fn: () => void | Promise<void>) => void;
	afterAll: (fn: () => void | Promise<void>) => void;
	expect: (actual: any) => any;
}

const INDEX_HTML_TEMPLATE = [
	'<!doctype html><html><head>',
	'<!-- VALAJS_PANEL_TITLE -->',
	'<!-- VALAJS_PANEL_FAVICON -->',
	'<!-- VALAJS_PANEL_SETTINGS -->',
	'</head><body><div id="root"></div></body></html>',
].join('\n');

export interface HttpContractSuiteConfig {
	/** Human-readable adapter name for the describe block */
	name: string;
	/** Fresh, un-initialized adapter instance */
	createAdapter: () => KratosHttpAdapter;
	/** Test-runner primitives from the calling test file: pass `{ describe, it, expect, beforeAll, afterAll }` from 'vitest' */
	test: ContractSuiteTestTools;
}

/**
 * Minimal Panel stand-in for adapter-level contract tests.
 * Only the surface the HTTP layer itself touches is implemented.
 */
export function createStubPanel(basePath = '/kratosjs/api', panelPath = '/'): Panel {
	return {
		getBasePath: () => basePath,
		getPanelPath: () => panelPath,
		getTitle: () => 'Contract Suite',
		getFavicon: () => undefined,
		getClientI18nConfig: () => ({}),
		transformMediaFieldsForStorage: async () => undefined,
		formatMediaKey: async (key: string, bucketName?: string) => ({ key, bucket: bucketName || 'default' }),
		resolveMediaUrl: async (mediaValue: any) =>
			typeof mediaValue === 'string' ? `/media/${mediaValue}` : undefined,
	} as unknown as Panel;
}

/**
 * Shared test suite asserting the KratosHttpAdapter contract against a live server.
 *
 * Every adapter (the in-repo InMemoryHttpAdapter reference and each published
 * framework adapter) must pass this suite unmodified — it pins the behaviors the
 * core relies on: request field mapping, reply semantics, cookie serialization,
 * error mapping, route precedence, static serving, and body limits.
 */
export function runHttpAdapterContractSuite(config: HttpContractSuiteConfig): void {
	const { describe, it, beforeAll, afterAll, expect } = config.test;

	describe(`HTTP adapter contract: ${config.name}`, () => {
		let adapter: KratosHttpAdapter;
		let baseUrl: string;
		let staticDir: string;
		const als = new AsyncLocalStorage<{ traceId: string }>();
		const callOrder: string[] = [];

		beforeAll(async () => {
			adapter = config.createAdapter();
			const panel = createStubPanel();

			await adapter.init({
				panel,
				basePath: '/kratosjs/api',
				panelPath: '/',
				bodyLimit: '50mb',
				cors: { origin: true, credentials: true },
			});

			// Static mount fixture
			staticDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kratos-http-contract-'));
			fs.writeFileSync(path.join(staticDir, 'hello.txt'), 'static hello');
			adapter.useStatic({ urlPath: '/assets', directory: staticDir });

			// --- Routes. Registration order matters: /echo/greet must beat /echo/:resource ---

			adapter.registerRoute({
				method: 'GET',
				path: '/echo/greet',
				source: 'app',
				handler: async (_req, reply) => reply.json({ winner: 'literal' }),
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/echo/:resource',
				source: 'panel',
				handler: async (req, reply) => reply.json({ winner: 'param', resource: req.params.resource }),
			});

			adapter.registerRoute({
				method: 'POST',
				path: '/echo/:resource/:id',
				source: 'app',
				handler: async (req, reply) => {
					reply.json({
						method: req.method,
						path: req.path,
						url: req.url,
						protocol: req.protocol,
						host: req.host,
						hasIp: typeof req.ip === 'string' && req.ip.length > 0,
						params: req.params,
						query: req.query,
						body: req.body,
						contentType: req.header('Content-Type'),
						cookies: req.cookies,
					});
				},
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/status-header',
				source: 'app',
				handler: async (_req, reply) => {
					reply.status(201).header('X-KratosJs-Refresh-Badges', 'true').json({ created: true });
				},
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/cookies',
				source: 'app',
				handler: async (_req, reply) => {
					reply
						.cookie('kratosjs_access_token', 'abc123', {
							httpOnly: true,
							sameSite: 'lax',
							path: '/',
							maxAge: 15 * 60 * 1000,
						})
						.cookie('kratosjs_refresh_token', 'def456', {
							httpOnly: true,
							sameSite: 'lax',
							path: '/kratosjs/api/auth/refresh',
							maxAge: 7 * 24 * 60 * 60 * 1000,
						})
						.json({ ok: true });
				},
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/clear-cookies',
				source: 'app',
				handler: async (_req, reply) => {
					reply.clearCookie('kratosjs_access_token', { path: '/' }).json({ ok: true });
				},
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/redirect',
				source: 'app',
				handler: async (_req, reply) => reply.redirect('https://example.com/next'),
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/redirect-to',
				source: 'app',
				handler: async (_req, reply) => reply.redirectTo('/page/permissions', { message: 'Saved' }),
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/export',
				source: 'app',
				handler: async (_req, reply) => {
					reply
						.header('Content-Type', 'text/csv')
						.header('Content-Disposition', 'attachment; filename="export.csv"')
						.send(Buffer.from('id,name\n1,Alice\n'));
				},
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/replies/html',
				source: 'app',
				handler: async (_req, reply) => reply.html('<h1>hello</h1>'),
			});

			// --- Error mapping through the composed pipeline ---

			adapter.registerRoute({
				method: 'GET',
				path: '/errors/validation',
				source: 'app',
				handler: composeHandler([], async () => {
					throw new ValidationError('Name is required', 'name', 'required');
				}),
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/errors/not-found',
				source: 'app',
				handler: composeHandler([], async () => {
					throw new Error('Record not found');
				}),
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/errors/generic',
				source: 'app',
				handler: composeHandler([], async () => {
					throw new Error('Something exploded');
				}),
			});

			// --- Pipeline semantics over the adapter ---

			const contextStep: KratosMiddleware = async (_req, _reply, next) => {
				callOrder.push('context');
				await als.run({ traceId: 'trace-42' }, () => next());
			};

			const authStep: KratosMiddleware = async (req, reply, next) => {
				callOrder.push('auth');
				if (req.header('Authorization') !== 'Bearer good') {
					reply.status(401).json({ error: 'Unauthorized' });
					return;
				}
				await next();
			};

			adapter.registerRoute({
				method: 'GET',
				path: '/pipeline/guarded',
				source: 'app',
				handler: composeHandler([contextStep, authStep], async (_req, reply) => {
					callOrder.push('handler');
					reply.json({ traceId: als.getStore()?.traceId ?? null });
				}),
			});

			await adapter.listen(0);
			baseUrl = `http://127.0.0.1:${adapter.getPort()}`;
		});

		afterAll(async () => {
			await adapter.close();
			fs.rmSync(staticDir, { recursive: true, force: true });
		});

		it('maps request fields: params, query, body, headers, cookies, ip, protocol, host', async () => {
			const res = await fetch(`${baseUrl}/echo/users/42?filter=active&tag=a&tag=b`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Cookie: 'kratosjs_access_token=tok123; other=x',
				},
				body: JSON.stringify({ hello: 'world', nested: { n: 1 } }),
			});

			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.method).toBe('POST');
			expect(data.path).toBe('/echo/users/42');
			expect(data.url).toContain('filter=active');
			expect(data.protocol).toBe('http');
			expect(typeof data.host).toBe('string');
			expect(data.hasIp).toBe(true);
			expect(data.params).toEqual({ resource: 'users', id: '42' });
			expect(data.query.filter).toBe('active');
			expect(data.query.tag).toEqual(['a', 'b']);
			expect(data.body).toEqual({ hello: 'world', nested: { n: 1 } });
			expect(data.contentType).toContain('application/json');
			expect(data.cookies).toEqual({ kratosjs_access_token: 'tok123', other: 'x' });
		});

		it('honors x-forwarded-proto for protocol', async () => {
			const res = await fetch(`${baseUrl}/echo/users/1`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'X-Forwarded-Proto': 'https' },
				body: JSON.stringify({}),
			});
			const data = await res.json();
			expect(data.protocol).toBe('https');
		});

		it('registration order wins over pattern specificity (custom routes beat params)', async () => {
			const literal = await fetch(`${baseUrl}/echo/greet`);
			expect(await literal.json()).toEqual({ winner: 'literal' });

			const param = await fetch(`${baseUrl}/echo/posts`);
			expect(await param.json()).toEqual({ winner: 'param', resource: 'posts' });
		});

		it('sends status codes and custom headers', async () => {
			const res = await fetch(`${baseUrl}/replies/status-header`);
			expect(res.status).toBe(201);
			expect(res.headers.get('X-KratosJs-Refresh-Badges')).toBe('true');
			expect(await res.json()).toEqual({ created: true });
		});

		it('serializes cookies exactly (path scoping, HttpOnly, SameSite, Max-Age in seconds)', async () => {
			const res = await fetch(`${baseUrl}/replies/cookies`);
			const setCookies = res.headers.getSetCookie();
			expect(setCookies).toHaveLength(2);

			const access = setCookies.find(cookie => cookie.startsWith('kratosjs_access_token='))!;
			expect(access).toContain('kratosjs_access_token=abc123');
			expect(access).toContain('Max-Age=900');
			expect(access).toContain('Path=/');
			expect(access).toContain('HttpOnly');
			expect(access).toContain('SameSite=Lax');

			const refresh = setCookies.find(cookie => cookie.startsWith('kratosjs_refresh_token='))!;
			// The refresh cookie MUST be scoped to the refresh endpoint (v1 regression guard)
			expect(refresh).toContain('Path=/kratosjs/api/auth/refresh');
			expect(refresh).toContain('Max-Age=604800');
		});

		it('clears cookies with an epoch expiry', async () => {
			const res = await fetch(`${baseUrl}/replies/clear-cookies`);
			const setCookies = res.headers.getSetCookie();
			expect(setCookies).toHaveLength(1);
			expect(setCookies[0]).toContain('kratosjs_access_token=');
			expect(setCookies[0]).toContain('Expires=Thu, 01 Jan 1970');
			expect(setCookies[0]).toContain('Path=/');
		});

		it('issues real HTTP redirects', async () => {
			const res = await fetch(`${baseUrl}/replies/redirect`, { redirect: 'manual' });
			expect(res.status).toBe(302);
			expect(res.headers.get('Location')).toBe('https://example.com/next');
		});

		it('redirectTo responds with the JSON redirect shape', async () => {
			const res = await fetch(`${baseUrl}/replies/redirect-to`);
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ redirect: '/page/permissions', message: 'Saved' });
		});

		it('sends binary bodies with explicit content type (export download)', async () => {
			const res = await fetch(`${baseUrl}/replies/export`);
			expect(res.headers.get('Content-Type')).toContain('text/csv');
			expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="export.csv"');
			expect(await res.text()).toBe('id,name\n1,Alice\n');
		});

		it('sends HTML with the right content type', async () => {
			const res = await fetch(`${baseUrl}/replies/html`);
			expect(res.headers.get('Content-Type')).toContain('text/html');
			expect(await res.text()).toBe('<h1>hello</h1>');
		});

		it('maps ValidationError to a structured 400', async () => {
			const res = await fetch(`${baseUrl}/errors/validation`);
			expect(res.status).toBe(400);
			const data = await res.json();
			expect(data.message).toBe('Name is required');
			expect(data.field).toBe('name');
			expect(data.rule).toBe('required');
		});

		it("maps 'not found' errors to 404", async () => {
			const res = await fetch(`${baseUrl}/errors/not-found`);
			expect(res.status).toBe(404);
			expect((await res.json()).message).toBe('Record not found');
		});

		it('maps unexpected errors to 500', async () => {
			const res = await fetch(`${baseUrl}/errors/generic`);
			expect(res.status).toBe(500);
			expect((await res.json()).message).toBe('Something exploded');
		});

		it('middleware short-circuits without reaching the handler, in order', async () => {
			callOrder.length = 0;
			const denied = await fetch(`${baseUrl}/pipeline/guarded`);
			expect(denied.status).toBe(401);
			expect(callOrder).toEqual(['context', 'auth']);
		});

		it('AsyncLocalStorage context set in middleware is visible in the handler', async () => {
			callOrder.length = 0;
			const res = await fetch(`${baseUrl}/pipeline/guarded`, {
				headers: { Authorization: 'Bearer good' },
			});
			expect(res.status).toBe(200);
			expect(await res.json()).toEqual({ traceId: 'trace-42' });
			expect(callOrder).toEqual(['context', 'auth', 'handler']);
		});

		it('serves static mounts', async () => {
			const res = await fetch(`${baseUrl}/assets/hello.txt`);
			expect(res.status).toBe(200);
			expect(await res.text()).toBe('static hello');
		});

		it('accepts multi-megabyte JSON bodies (base64 upload requirement)', async () => {
			const payload = { file: 'a'.repeat(4 * 1024 * 1024) };
			const res = await fetch(`${baseUrl}/echo/files/1`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			expect(res.status).toBe(200);
			const data = await res.json();
			expect(data.body.file.length).toBe(4 * 1024 * 1024);
		});

		it('returns CORS headers reflecting the origin with credentials', async () => {
			const res = await fetch(`${baseUrl}/echo/greet`, {
				headers: { Origin: 'http://localhost:5173' },
			});
			expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
			expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
		});
	});

	describe(`HTTP adapter contract: ${config.name} — admin SPA (production)`, () => {
		let adapter: KratosHttpAdapter;
		let baseUrl: string;
		let appRoot: string;

		beforeAll(async () => {
			// Fixture app with a built admin bundle
			appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kratos-http-spa-'));
			const adminDist = path.join(appRoot, 'dist', 'admin');
			fs.mkdirSync(path.join(adminDist, 'assets'), { recursive: true });
			fs.writeFileSync(path.join(adminDist, 'index.html'), INDEX_HTML_TEMPLATE);
			fs.writeFileSync(path.join(adminDist, 'assets', 'app.js'), 'console.log("bundle");');

			adapter = config.createAdapter();
			const panel = createStubPanel();

			await adapter.init({
				panel,
				basePath: '/kratosjs/api',
				panelPath: '/',
				bodyLimit: '1mb',
				cors: { origin: true, credentials: true },
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/kratosjs/api/meta',
				source: 'panel',
				handler: async (_req, reply) => reply.json({ api: true }),
			});

			const spa = new AdminSpaService(panel, { appRoot, mode: 'production' });
			await adapter.serveAdminSpa(spa);
			await adapter.listen(0);
			baseUrl = `http://127.0.0.1:${adapter.getPort()}`;
		});

		afterAll(async () => {
			await adapter.close();
			fs.rmSync(appRoot, { recursive: true, force: true });
		});

		it('serves the transformed index.html as SPA fallback with injected globals', async () => {
			const res = await fetch(`${baseUrl}/some/client/route`);
			expect(res.status).toBe(200);
			expect(res.headers.get('Content-Type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain("window.__VALAJS_API_BASE_PATH__ = '/kratosjs/api'");
			expect(html).toContain("window.__VALAJS_PANEL_PATH__ = '/'");
			expect(html).toContain('window.__VALAJS_I18N__ =');
			expect(html).toContain('<title>Contract Suite</title>');
		});

		it('serves built admin assets statically', async () => {
			const res = await fetch(`${baseUrl}/assets/app.js`);
			expect(res.status).toBe(200);
			expect(await res.text()).toContain('bundle');
		});

		it('API routes win over the SPA fallback', async () => {
			const res = await fetch(`${baseUrl}/kratosjs/api/meta`);
			expect(res.headers.get('Content-Type')).toContain('application/json');
			expect(await res.json()).toEqual({ api: true });
		});

		it('does not SPA-fallback non-GET requests', async () => {
			const res = await fetch(`${baseUrl}/some/client/route`, { method: 'POST' });
			expect(res.status).toBe(404);
		});
	});

	describe(`HTTP adapter contract: ${config.name} — admin SPA scoped to /admin (production)`, () => {
		let adapter: KratosHttpAdapter;
		let baseUrl: string;
		let appRoot: string;

		beforeAll(async () => {
			appRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'kratos-http-spa-admin-'));
			const adminDist = path.join(appRoot, 'dist', 'admin');
			fs.mkdirSync(path.join(adminDist, 'assets'), { recursive: true });
			fs.writeFileSync(path.join(adminDist, 'index.html'), INDEX_HTML_TEMPLATE);
			fs.writeFileSync(path.join(adminDist, 'assets', 'app.js'), 'console.log("bundle");');

			adapter = config.createAdapter();
			// API stays at /kratosjs/api; the admin UI is scoped to /admin.
			const panel = createStubPanel('/kratosjs/api', '/admin');

			await adapter.init({
				panel,
				basePath: '/kratosjs/api',
				panelPath: '/admin',
				bodyLimit: '1mb',
				cors: { origin: true, credentials: true },
			});

			adapter.registerRoute({
				method: 'GET',
				path: '/kratosjs/api/meta',
				source: 'panel',
				handler: async (_req, reply) => reply.json({ api: true }),
			});

			const spa = new AdminSpaService(panel, { appRoot, mode: 'production', panelPath: '/admin' });
			await adapter.serveAdminSpa(spa);
			await adapter.listen(0);
			baseUrl = `http://127.0.0.1:${adapter.getPort()}`;
		});

		afterAll(async () => {
			await adapter.close();
			fs.rmSync(appRoot, { recursive: true, force: true });
		});

		it('serves the SPA shell under the panel path with the injected panel path global', async () => {
			const res = await fetch(`${baseUrl}/admin/some/client/route`);
			expect(res.status).toBe(200);
			expect(res.headers.get('Content-Type')).toContain('text/html');
			const html = await res.text();
			expect(html).toContain("window.__VALAJS_PANEL_PATH__ = '/admin'");
			expect(html).toContain("window.__VALAJS_API_BASE_PATH__ = '/kratosjs/api'");
		});

		it('serves built admin assets under the panel path', async () => {
			const res = await fetch(`${baseUrl}/admin/assets/app.js`);
			expect(res.status).toBe(200);
			expect(await res.text()).toContain('bundle');
		});

		it('does NOT serve the SPA outside the panel path (root is free)', async () => {
			const res = await fetch(`${baseUrl}/some/client/route`);
			expect(res.status).toBe(404);
		});

		it('API routes win and are reachable regardless of the panel path', async () => {
			const res = await fetch(`${baseUrl}/kratosjs/api/meta`);
			expect(res.headers.get('Content-Type')).toContain('application/json');
			expect(await res.json()).toEqual({ api: true });
		});

		it('does not SPA-fallback non-GET requests under the panel path', async () => {
			const res = await fetch(`${baseUrl}/admin/some/route`, { method: 'POST' });
			expect(res.status).toBe(404);
		});
	});
}
