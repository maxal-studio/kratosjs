import Hapi, { Server, Request, ResponseToolkit } from '@hapi/hapi';
import Inert from '@hapi/inert';
import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {
	KratosHttpAdapter,
	createReply,
	parseByteSize,
	type AdapterInitContext,
	type AdminSpaService,
	type ConnectMiddleware,
	type CorsOptions,
	type Panel,
	type RouteDefinition,
	type StaticMount,
} from '@maxal_studio/kratosjs';
import { HapiReplyDriver, toKratosRequest } from './driver.js';

export interface HapiAdapterOptions {
	/**
	 * Mount KratosJs onto an existing Hapi server instead of creating one.
	 * When provided, CORS and the payload limit are the host server's
	 * responsibility (both are instance-creation options in Hapi).
	 */
	app?: Server;

	/**
	 * JSON body size limit, e.g. '50mb' (the default — file uploads travel as
	 * base64 JSON). Hapi fixes the payload limit at server creation, so with this
	 * adapter it is configured HERE rather than via `panel.http({ bodyLimit })`.
	 */
	bodyLimit?: string;
}

/** Translate ':name' route params (Express/Fastify style) to Hapi's '{name}'. */
function toHapiPath(routePath: string): string {
	return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
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

/**
 * Hapi implementation of the KratosHttpAdapter contract.
 *
 * Hapi differs from Express/Fastify in two ways the adapter bridges:
 * - Responses are RETURNED from handlers (not mutated in place) — the reply's
 *   recorded state is replayed onto `h.response()` after the handler resolves.
 * - There is no connect-middleware system — the Vite dev server's middlewares run
 *   in an `onRequest` extension against the raw node req/res, with `h.abandon`
 *   when Vite serves the request. CORS and the SPA/asset fallback live in
 *   `onPreResponse`.
 *
 * @example
 * ```typescript
 * import { HapiAdapter } from '@maxal_studio/kratosjs-hapi';
 *
 * Panel.make('admin')
 *   .httpAdapter(new HapiAdapter())
 *   // ...
 *   .start(3000);
 * ```
 */
export class HapiAdapter extends KratosHttpAdapter {
	readonly name = 'hapi';

	private readonly server: Server;
	private readonly ownsServer: boolean;
	private readonly bodyLimit: string;
	private panel!: Panel;
	private cors: CorsOptions = false;
	private spa?: AdminSpaService;
	private devMiddlewares?: ConnectMiddleware;
	private inertRegistered = false;

	constructor(options: HapiAdapterOptions = {}) {
		super();
		this.ownsServer = !options.app;
		this.bodyLimit = options.bodyLimit ?? '50mb';
		this.server =
			options.app ??
			Hapi.server({
				routes: {
					payload: { maxBytes: parseByteSize(this.bodyLimit) },
				},
			});
	}

	async init(ctx: AdapterInitContext): Promise<void> {
		this.panel = ctx.panel;
		this.cors = ctx.cors;

		if (this.ownsServer && ctx.bodyLimit !== this.bodyLimit && ctx.bodyLimit !== '50mb') {
			console.warn(
				`[kratosjs] panel.http({ bodyLimit: '${ctx.bodyLimit}' }) has no effect with the hapi adapter — ` +
					`pass it to the adapter instead: new HapiAdapter({ bodyLimit: '${ctx.bodyLimit}' })`,
			);
		}

		await this.ensureInert();

		// CORS is applied manually (reflect origin + credentials) so behavior matches
		// every other adapter exactly, rather than Hapi's `origin: ['*']` semantics.
		this.server.ext('onPreResponse', (request, h) => this.onPreResponse(request, h));
	}

	private async ensureInert(): Promise<void> {
		if (!this.inertRegistered && this.ownsServer) {
			await this.server.register(Inert);
			this.inertRegistered = true;
		}
	}

	registerRoute(route: RouteDefinition): void {
		this.server.route({
			method: route.method,
			path: toHapiPath(route.path),
			options: { cors: false },
			handler: async (request: Request, h: ResponseToolkit) => {
				const driver = new HapiReplyDriver(h);
				const reply = createReply(driver);
				await route.handler(toKratosRequest(request, this.panel), reply);
				return driver.toResponse();
			},
		});
	}

	useStatic(mount: StaticMount): void {
		this.server.route({
			method: 'GET',
			path: `${mount.urlPath}/{param*}`,
			options: { cors: false },
			handler: {
				directory: { path: path.resolve(mount.directory), index: false, redirectToSlash: false },
			},
		});
	}

	async serveAdminSpa(spa: AdminSpaService): Promise<void> {
		this.spa = spa;

		if (spa.mode === 'development') {
			const dev = await spa.createDevServer();
			this.devMiddlewares = dev.middlewares;

			// Vite's connect middlewares serve modules/HMR/assets. They run before
			// routing against the raw node req/res; if Vite responds, Hapi abandons
			// the request. Non-asset paths (API routes, client routes) fall through.
			this.server.ext('onRequest', async (request, h) => {
				if (!this.devMiddlewares) return h.continue;
				// Vite's base middleware strips the panel path from raw.req.url; snapshot
				// the original pathname first so the SPA fallback can still scope by it.
				(request.app as any).kratosOrigPath = request.url.pathname;
				const handled = await runConnectMiddleware(this.devMiddlewares, request.raw.req, request.raw.res);
				return handled ? h.abandon : h.continue;
			});
		}
		// Production assets + the SPA shell are served from onPreResponse (below),
		// which layers the built bundle under any useStatic mounts — matching the
		// express adapter's static-fallback behavior.
	}

	/** CORS on every response + the SPA/asset fallback for unmatched GET/HEAD. */
	private async onPreResponse(request: Request, h: ResponseToolkit) {
		const response = request.response;
		const isBoom = 'isBoom' in response && response.isBoom;
		const statusCode = isBoom ? (response as any).output.statusCode : (response as any).statusCode;

		// SPA / static fallback for unmatched GET/HEAD requests under the panel path.
		if (this.spa && statusCode === 404 && this.spa.shouldFallback(request.method, this.originalPathname(request))) {
			const fallback = await this.buildSpaFallback(request, h);
			if (fallback) {
				this.applyCors(request, fallback);
				return fallback.takeover();
			}
		}

		this.applyCors(request, response as any);
		return h.continue;
	}

	/** The pre-Vite pathname (Vite strips the panel-path base from the raw URL in dev). */
	private originalPathname(request: Request): string {
		return ((request.app as any).kratosOrigPath as string | undefined) ?? request.url.pathname;
	}

	private async buildSpaFallback(request: Request, h: ResponseToolkit) {
		const spa = this.spa!;

		if (spa.mode === 'production') {
			// Try the built bundle first (hashed assets), then the SPA shell. The
			// request path is stripped of the panel-path prefix before mapping to a file.
			const distDir = path.resolve(spa.adminDistDir!);
			const candidate = path.resolve(distDir, spa.assetRelativePath(request.url.pathname));
			if (
				(candidate === distDir || candidate.startsWith(distDir + path.sep)) &&
				fs.existsSync(candidate) &&
				fs.statSync(candidate).isFile()
			) {
				// confine:false — the path is an absolute path we already validated is
				// inside distDir; inert's default confinement rejects absolute paths.
				return h.file(candidate, { confine: false });
			}
			return h.response(spa.getIndexHtml()).type('text/html; charset=utf-8').code(200);
		}

		const dev = await spa.createDevServer();
		const html = await dev.renderIndexHtml(this.originalPathname(request) + request.url.search);
		return h.response(html).type('text/html; charset=utf-8').code(200);
	}

	private applyCors(request: Request, response: any): void {
		const cors = this.cors;
		if (cors === false) return;
		const rawOrigin = request.headers.origin;
		const requestOrigin = Array.isArray(rawOrigin) ? rawOrigin[0] : rawOrigin;

		let allowOrigin: string | undefined;
		if (cors.origin === true) {
			allowOrigin = requestOrigin || '*';
		} else if (typeof cors.origin === 'string') {
			allowOrigin = cors.origin;
		} else if (Array.isArray(cors.origin) && requestOrigin && cors.origin.includes(requestOrigin)) {
			allowOrigin = requestOrigin;
		}

		const setHeader = (name: string, value: string) => {
			if (response.isBoom) {
				response.output.headers[name] = value;
			} else {
				response.header(name, value);
			}
		};

		if (allowOrigin) {
			setHeader('access-control-allow-origin', allowOrigin);
			setHeader('vary', 'Origin');
		}
		if (cors.credentials) {
			setHeader('access-control-allow-credentials', 'true');
		}
	}

	async listen(port: number, callback?: () => void): Promise<void> {
		this.server.settings.port = port;
		await this.server.start();
		callback?.();
	}

	async close(): Promise<void> {
		await this.spa?.close();
		await this.server.stop();
	}

	getNative<T = unknown>(): T {
		return this.server as unknown as T;
	}

	getPort(): number {
		const port = this.server.info?.port;
		if (typeof port === 'number') {
			return port;
		}
		throw new Error('[kratosjs] Server is not listening');
	}
}
