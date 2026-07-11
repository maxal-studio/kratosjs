import Koa, { Context, Next } from 'koa';
import Router from '@koa/router';
import { bodyParser } from '@koa/bodyparser';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
	KratosHttpAdapter,
	createReply,
	type AdapterInitContext,
	type AdminSpaService,
	type ConnectMiddleware,
	type CorsOptions,
	type Panel,
	type RouteDefinition,
	type StaticMount,
} from '@maxal_studio/kratosjs';
import { KoaReplyDriver, toKratosRequest } from './driver.js';

export interface KoaAdapterOptions {
	/**
	 * Mount KratosJs onto an existing Koa app instead of creating one. The panel's
	 * body parser, CORS, routes, and admin SPA middleware are appended to it.
	 */
	app?: Koa;
}

/** Run a connect-style middleware against raw node req/res; resolves true if it responded. */
function runConnectMiddleware(mw: ConnectMiddleware, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
	return new Promise((resolve, reject) => {
		let settled = false;
		res.on('finish', () => {
			if (!settled) {
				settled = true;
				resolve(true);
			}
		});
		mw(req, res, (err?: any) => {
			if (settled) return;
			settled = true;
			if (err) reject(err);
			else resolve(false);
		});
	});
}

/** Serve a file from rootDir if it exists (guards path traversal). Returns true if served. */
function serveFileFrom(ctx: Context, rootDir: string, requestPath: string): boolean {
	const base = path.resolve(rootDir);
	const relative = decodeURIComponent(requestPath).replace(/^\/+/, '');
	const filePath = path.resolve(base, relative);
	if (filePath !== base && !filePath.startsWith(base + path.sep)) {
		return false;
	}
	if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
		return false;
	}
	ctx.type = path.extname(filePath);
	ctx.body = fs.readFileSync(filePath);
	return true;
}

/**
 * Koa implementation of the KratosHttpAdapter contract.
 *
 * Koa has no built-in router (@koa/router provides `:param` routing) and flushes
 * the response lazily after the middleware chain. The adapter buffers routes and
 * static mounts, then assembles the middleware stack in the correct order at
 * listen() — body parser, CORS, router, static mounts, then the admin SPA (Vite
 * dev middleware via the raw node req/res, or static production serving). CORS and
 * static serving are handled directly to keep the dependency surface small.
 *
 * @example
 * ```typescript
 * import { KoaAdapter } from '@maxal_studio/kratosjs-koa';
 *
 * Panel.make('admin')
 *   .httpAdapter(new KoaAdapter())
 *   // ...
 *   .start(3000);
 * ```
 */
export class KoaAdapter extends KratosHttpAdapter {
	readonly name = 'koa';

	private readonly app: Koa;
	private readonly router: Router;
	private panel!: Panel;
	private bodyLimit = '50mb';
	private cors: CorsOptions = false;
	private staticMounts: StaticMount[] = [];
	private spa?: AdminSpaService;
	private devMiddlewares?: ConnectMiddleware;
	private server?: Server;

	constructor(options: KoaAdapterOptions = {}) {
		super();
		this.app = options.app ?? new Koa();
		this.router = new Router();
	}

	init(ctx: AdapterInitContext): void {
		this.panel = ctx.panel;
		this.bodyLimit = ctx.bodyLimit;
		this.cors = ctx.cors;
	}

	registerRoute(route: RouteDefinition): void {
		const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
		// @koa/router understands ':param' natively — no path translation needed.
		this.router[method](route.path, async (ctx: Context) => {
			const reply = createReply(new KoaReplyDriver(ctx));
			await route.handler(toKratosRequest(ctx, this.panel), reply);
		});
	}

	useStatic(mount: StaticMount): void {
		this.staticMounts.push(mount);
	}

	async serveAdminSpa(spa: AdminSpaService): Promise<void> {
		this.spa = spa;
		if (spa.mode === 'development') {
			const dev = await spa.createDevServer();
			this.devMiddlewares = dev.middlewares;
		}
	}

	async listen(port: number, callback?: () => void): Promise<void> {
		this.assembleMiddleware();
		await new Promise<void>(resolve => {
			this.server = this.app.listen(port, () => {
				callback?.();
				resolve();
			});
		});
	}

	/** Wire the middleware stack in order. Called once, from listen(). */
	private assembleMiddleware(): void {
		this.app.use(bodyParser({ jsonLimit: this.bodyLimit, encoding: 'utf-8' }));
		this.app.use((ctx, next) => this.corsMiddleware(ctx, next));
		this.app.use(this.router.routes());

		for (const mount of this.staticMounts) {
			this.app.use((ctx, next) => this.staticMiddleware(ctx, next, mount));
		}

		if (this.spa) {
			if (this.devMiddlewares) {
				this.app.use((ctx, next) => this.viteMiddleware(ctx, next));
			} else if (this.spa.mode === 'production') {
				this.app.use((ctx, next) => this.prodAssetMiddleware(ctx, next));
			}
			this.app.use(ctx => this.spaFallback(ctx));
		}
	}

	private async corsMiddleware(ctx: Context, next: Next): Promise<void> {
		this.applyCors(ctx);
		if (this.cors !== false && ctx.method === 'OPTIONS' && ctx.get('access-control-request-method')) {
			ctx.set('access-control-allow-methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
			const requestHeaders = ctx.get('access-control-request-headers');
			if (requestHeaders) {
				ctx.set('access-control-allow-headers', requestHeaders);
			}
			ctx.status = 204;
			ctx.body = null;
			return;
		}
		await next();
	}

	private applyCors(ctx: Context): void {
		const cors = this.cors;
		if (cors === false) return;
		const requestOrigin = ctx.get('Origin');

		let allowOrigin: string | undefined;
		if (cors.origin === true) {
			allowOrigin = requestOrigin || '*';
		} else if (typeof cors.origin === 'string') {
			allowOrigin = cors.origin;
		} else if (Array.isArray(cors.origin) && requestOrigin && cors.origin.includes(requestOrigin)) {
			allowOrigin = requestOrigin;
		}

		if (allowOrigin) {
			ctx.set('access-control-allow-origin', allowOrigin);
			ctx.vary('Origin');
		}
		if (cors.credentials) {
			ctx.set('access-control-allow-credentials', 'true');
		}
	}

	private async staticMiddleware(ctx: Context, next: Next, mount: StaticMount): Promise<void> {
		if (ctx.method !== 'GET' && ctx.method !== 'HEAD') {
			return next();
		}
		if (ctx.path === mount.urlPath || ctx.path.startsWith(`${mount.urlPath}/`)) {
			if (serveFileFrom(ctx, mount.directory, ctx.path.slice(mount.urlPath.length))) {
				return;
			}
		}
		return next();
	}

	private async viteMiddleware(ctx: Context, next: Next): Promise<void> {
		if (!this.devMiddlewares) {
			return next();
		}
		const handled = await runConnectMiddleware(this.devMiddlewares, ctx.req, ctx.res);
		if (handled) {
			// Vite wrote directly to the raw response — tell Koa not to touch it.
			ctx.respond = false;
			return;
		}
		return next();
	}

	private async prodAssetMiddleware(ctx: Context, next: Next): Promise<void> {
		const spa = this.spa!;
		if (
			(ctx.method === 'GET' || ctx.method === 'HEAD') &&
			spa.isUnderPanelPath(ctx.path) &&
			serveFileFrom(ctx, spa.adminDistDir!, spa.assetRelativePath(ctx.path))
		) {
			return;
		}
		return next();
	}

	private async spaFallback(ctx: Context): Promise<void> {
		const spa = this.spa!;
		// Vite's base middleware strips the panel path from ctx.req.url (and thus ctx.path)
		// in dev; ctx.originalUrl is immutable, so scope the fallback against it.
		const originalPath = ctx.originalUrl.split('?')[0];
		if (!spa.shouldFallback(ctx.method, originalPath)) {
			return; // leave the 404
		}
		ctx.type = 'html';
		ctx.body =
			spa.mode === 'production'
				? spa.getIndexHtml()
				: await (await spa.createDevServer()).renderIndexHtml(ctx.originalUrl);
	}

	async close(): Promise<void> {
		await this.spa?.close();
		if (this.server) {
			await new Promise<void>((resolve, reject) => {
				this.server!.close(error => (error ? reject(error) : resolve()));
			});
			this.server = undefined;
		}
	}

	getNative<T = unknown>(): T {
		return this.app as unknown as T;
	}

	getPort(): number {
		const address = this.server?.address();
		if (address && typeof address === 'object') {
			return address.port;
		}
		throw new Error('[kratosjs] Server is not listening');
	}
}
