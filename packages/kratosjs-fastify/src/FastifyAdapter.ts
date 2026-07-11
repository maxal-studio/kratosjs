import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import middie from '@fastify/middie';
import path from 'node:path';
import {
	KratosHttpAdapter,
	createReply,
	parseByteSize,
	type AdapterInitContext,
	type AdminSpaService,
	type Panel,
	type RouteDefinition,
	type StaticMount,
} from '@maxal_studio/kratosjs';
import { FastifyReplyDriver, toKratosRequest } from './driver.js';

export interface FastifyAdapterOptions {
	/**
	 * Mount KratosJs onto an existing Fastify instance instead of creating one.
	 * When provided, the adapter assumes CORS and the body limit are the host
	 * app's responsibility (fastify's bodyLimit is fixed at instance creation).
	 */
	app?: FastifyInstance;

	/**
	 * JSON body size limit, e.g. '50mb' (the default — file uploads travel as
	 * base64 JSON). Fastify fixes the limit at instance creation, so with this
	 * adapter it is configured HERE rather than via `panel.http({ bodyLimit })`.
	 */
	bodyLimit?: string;
}

/**
 * Fastify implementation of the KratosHttpAdapter contract.
 *
 * A pure translation layer: registers each fully composed route from the core
 * route table, converts fastify request/reply to KratosRequest/KratosReply,
 * serves static mounts via @fastify/static, and wires the admin SPA (Vite
 * middleware mode through @fastify/middie in development).
 *
 * Route matching note: fastify's router (find-my-way) ranks static segments
 * above ':param' segments, so custom routes like '/greet' still win over the
 * panel's '/:resource/...' patterns — same outcome as the express adapter.
 *
 * @example
 * ```typescript
 * import { FastifyAdapter } from '@maxal_studio/kratosjs-fastify';
 *
 * Panel.make('admin')
 *   .httpAdapter(new FastifyAdapter())
 *   // ...
 *   .start(3000);
 * ```
 */
export class FastifyAdapter extends KratosHttpAdapter {
	readonly name = 'fastify';

	private readonly app: FastifyInstance;
	private readonly ownsApp: boolean;
	private readonly bodyLimit: string;
	private panel!: Panel;
	private spa?: AdminSpaService;
	private staticMountCount = 0;

	constructor(options: FastifyAdapterOptions = {}) {
		super();
		this.ownsApp = !options.app;
		this.bodyLimit = options.bodyLimit ?? '50mb';
		// The body limit is an instance-creation option in fastify, so the app is
		// created here (which also makes getFastifyApp(panel) usable before start()).
		this.app = options.app ?? fastify({ bodyLimit: parseByteSize(this.bodyLimit) });
	}

	async init(ctx: AdapterInitContext): Promise<void> {
		this.panel = ctx.panel;

		if (this.ownsApp && ctx.bodyLimit !== this.bodyLimit && ctx.bodyLimit !== '50mb') {
			console.warn(
				`[kratosjs] panel.http({ bodyLimit: '${ctx.bodyLimit}' }) has no effect with the fastify adapter — ` +
					`pass it to the adapter instead: new FastifyAdapter({ bodyLimit: '${ctx.bodyLimit}' })`,
			);
		}

		if (this.ownsApp) {
			// Express-parity JSON parsing: tolerate an empty body instead of 400ing.
			this.app.removeContentTypeParser('application/json');
			this.app.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
				if (body === '' || body === undefined) {
					done(null, undefined);
					return;
				}
				try {
					done(null, JSON.parse(body as string));
				} catch (error: any) {
					error.statusCode = 400;
					done(error, undefined);
				}
			});

			if (ctx.cors !== false) {
				await this.app.register(fastifyCors, {
					origin: ctx.cors.origin,
					credentials: ctx.cors.credentials,
				});
			}
		}
	}

	registerRoute(route: RouteDefinition): void {
		this.app.route({
			method: route.method,
			url: route.path,
			handler: async (request: FastifyRequest, fastifyReply: FastifyReply) => {
				const kratosRequest = toKratosRequest(request, this.panel);
				const reply = createReply(new FastifyReplyDriver(fastifyReply));
				await route.handler(kratosRequest, reply);
				// A handler that never responded would otherwise hang fastify's
				// async-route contract — end with an empty 200, like the reference adapter.
				if (!reply.sent && !fastifyReply.sent) {
					fastifyReply.send('');
				}
			},
		});
	}

	useStatic(mount: StaticMount): void {
		this.app.register(fastifyStatic, {
			root: path.resolve(mount.directory),
			prefix: mount.urlPath,
			// Only the first registration may decorate the reply object
			decorateReply: this.staticMountCount === 0,
			index: false,
		});
		this.staticMountCount++;
	}

	async serveAdminSpa(spa: AdminSpaService): Promise<void> {
		this.spa = spa;

		if (spa.mode === 'production') {
			// Hashed assets (JS/CSS/images). `wildcard: false` registers one exact
			// route per built file — exact routes outrank the `/prefix/*` wildcards
			// of useStatic() mounts (fastify routes don't fall through like express
			// middleware, so a `/assets` mount would otherwise shadow `/assets/*.js`
			// from the bundle). Unknown paths reach the not-found handler → SPA shell.
			this.app.register(fastifyStatic, {
				root: spa.adminDistDir!,
				// Serve the built bundle under the panel path (e.g. /admin/assets/app.js).
				prefix: spa.panelPath,
				wildcard: false,
				decorateReply: this.staticMountCount === 0,
				index: false,
			});
			this.staticMountCount++;
		} else {
			// Development: Vite middleware mode (HMR) via connect-style middleware.
			await this.app.register(middie);
			const dev = await spa.createDevServer();
			this.app.use(dev.middlewares);
		}

		// SPA fallback: unrouted GET/HEAD requests UNDER the panel path get the shell;
		// paths outside it stay 404 (freeing them for the app's own routes).
		this.app.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
			const pathname = request.url.split('?')[0];
			if (!spa.shouldFallback(request.method, pathname)) {
				reply.code(404).send({ message: `Cannot ${request.method} ${request.url}` });
				return;
			}
			const html =
				spa.mode === 'production'
					? spa.getIndexHtml()
					: await (await spa.createDevServer()).renderIndexHtml(request.url);
			reply.code(200).header('Content-Type', 'text/html; charset=utf-8').send(html);
		});
	}

	async listen(port: number, callback?: () => void): Promise<void> {
		await this.app.listen({ port, host: '0.0.0.0' });
		callback?.();
	}

	async close(): Promise<void> {
		await this.spa?.close();
		await this.app?.close();
	}

	getNative<T = unknown>(): T {
		return this.app as unknown as T;
	}

	getPort(): number {
		const address = this.app?.server.address();
		if (address && typeof address === 'object') {
			return address.port;
		}
		throw new Error('[kratosjs] Server is not listening');
	}
}
