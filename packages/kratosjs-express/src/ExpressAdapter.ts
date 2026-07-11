import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import type { Server } from 'node:http';
import {
	KratosHttpAdapter,
	createReply,
	type AdapterInitContext,
	type AdminSpaService,
	type Panel,
	type RouteDefinition,
	type StaticMount,
} from '@maxal_studio/kratosjs';
import { ExpressReplyDriver, toKratosRequest } from './driver.js';

export interface ExpressAdapterOptions {
	/**
	 * Mount KratosJs onto an existing Express app instead of creating one.
	 * When provided, the adapter assumes CORS is the host app's responsibility;
	 * JSON body parsing (with the panel body limit) is still installed.
	 */
	app?: Express;
}

/**
 * Express implementation of the KratosHttpAdapter contract.
 *
 * A pure translation layer: registers each fully composed route from the core
 * route table, converts express req/res to KratosRequest/KratosReply, serves
 * static mounts, and wires the admin SPA (Vite middleware mode in development).
 *
 * @example
 * ```typescript
 * import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
 *
 * Panel.make('admin')
 *   .httpAdapter(new ExpressAdapter())
 *   // ...
 *   .start(3000);
 * ```
 */
export class ExpressAdapter extends KratosHttpAdapter {
	readonly name = 'express';

	private app: Express;
	private readonly ownsApp: boolean;
	private panel!: Panel;
	private server?: Server;
	private spa?: AdminSpaService;

	constructor(options: ExpressAdapterOptions = {}) {
		super();
		this.ownsApp = !options.app;
		this.app = options.app ?? express();
	}

	init(ctx: AdapterInitContext): void {
		this.panel = ctx.panel;

		if (ctx.cors !== false && this.ownsApp) {
			this.app.use(cors({ origin: ctx.cors.origin as any, credentials: ctx.cors.credentials }));
		}
		this.app.use(express.json({ limit: ctx.bodyLimit }));
	}

	registerRoute(route: RouteDefinition): void {
		const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
		this.app[method](route.path, async (req: Request, res: Response) => {
			const kratosRequest = toKratosRequest(req, this.panel);
			const reply = createReply(new ExpressReplyDriver(res));
			await route.handler(kratosRequest, reply);
		});
	}

	useStatic(mount: StaticMount): void {
		this.app.use(mount.urlPath, express.static(mount.directory));
	}

	async serveAdminSpa(spa: AdminSpaService): Promise<void> {
		this.spa = spa;

		if (spa.mode === 'production') {
			// Hashed assets (JS/CSS/images), served under the panel path (Express strips
			// the mount prefix, so /admin/assets/app.js → adminDist/assets/app.js).
			// redirect:false so a bare `/admin` isn't 302'd to `/admin/` — it falls
			// through to the SPA shell below, matching dev.
			this.app.use(spa.panelPath, express.static(spa.adminDistDir!, { index: false, redirect: false }));

			// SPA fallback: remaining GET/HEAD requests UNDER the panel path (API routes
			// are registered earlier; paths outside the panel path fall through to 404).
			this.app.use((req: Request, res: Response, next: NextFunction) => {
				if (!spa.shouldFallback(req.method, req.path)) {
					return next();
				}
				res.type('html').send(spa.getIndexHtml());
			});
			return;
		}

		// Development: Vite middleware mode (HMR) + per-request transformed index.html
		const dev = await spa.createDevServer();
		this.app.use(dev.middlewares);
		this.app.use(async (req: Request, res: Response, next: NextFunction) => {
			// Vite's base middleware strips the panel path from req.url, so scope the
			// fallback against the original (unmutated) URL.
			const pathname = (req.originalUrl || req.url).split('?')[0];
			if (!spa.shouldFallback(req.method, pathname)) {
				return next();
			}
			try {
				const html = await dev.renderIndexHtml(req.originalUrl);
				res.type('html').send(html);
			} catch (error) {
				next(error);
			}
		});
	}

	async listen(port: number, callback?: () => void): Promise<void> {
		await new Promise<void>(resolve => {
			this.server = this.app.listen(port, () => {
				callback?.();
				resolve();
			});
		});
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
