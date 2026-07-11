import type { INestApplication } from '@nestjs/common';
import {
	KratosHttpAdapter,
	type AdapterInitContext,
	type AdminSpaService,
	type RouteDefinition,
	type StaticMount,
} from '@maxal_studio/kratosjs';

/**
 * KratosHttpAdapter that mounts a KratosJs panel onto an **existing NestJS app**
 * rather than owning the HTTP server.
 *
 * NestJS runs on the same two platforms KratosJs already supports —
 * `@nestjs/platform-express` and `@nestjs/platform-fastify` — so this adapter is
 * a thin delegating wrapper: every phase (`init` / `useStatic` / `registerRoute`
 * / `serveAdminSpa`) is forwarded to a pre-built Express or Fastify adapter that
 * was constructed over the Nest app's underlying framework instance
 * (`app.getHttpAdapter().getInstance()`).
 *
 * The one difference from a standalone adapter is `listen()`: **NestJS owns
 * listening** (`app.listen()`), so `listen()` here is a no-op. `Panel.start(0)`
 * still drives the full mount sequence — it just doesn't bind a port; Nest binds
 * it afterwards.
 *
 * You normally don't construct this directly — use {@link mountKratos}, which
 * detects the platform, builds the inner adapter, and wires it to the panel.
 */
export class NestAdapter extends KratosHttpAdapter {
	readonly name = 'nestjs';

	/**
	 * @param app   The Nest application (owns the HTTP server / lifecycle).
	 * @param inner A pre-built Express/Fastify adapter created over
	 *              `app.getHttpAdapter().getInstance()`. Built by the caller so
	 *              this constructor can stay synchronous (the platform adapter is
	 *              loaded via dynamic `import()` in {@link mountKratos}).
	 */
	constructor(
		private readonly app: INestApplication,
		private readonly inner: KratosHttpAdapter,
	) {
		super();
	}

	init(ctx: AdapterInitContext): void | Promise<void> {
		return this.inner.init(ctx);
	}

	registerRoute(route: RouteDefinition): void {
		this.inner.registerRoute(route);
	}

	useStatic(mount: StaticMount): void {
		this.inner.useStatic(mount);
	}

	serveAdminSpa(spa: AdminSpaService): void | Promise<void> {
		return this.inner.serveAdminSpa(spa);
	}

	/**
	 * No-op: NestJS owns the HTTP server. The port passed to `panel.start()` is
	 * ignored — call `app.listen(port)` on the Nest app after mounting.
	 */
	async listen(): Promise<void> {
		// intentionally empty — Nest binds the port via app.listen()
	}

	async close(): Promise<void> {
		// Close only what KratosJs owns (e.g. the Vite dev server the inner
		// adapter started in serveAdminSpa). The Nest application lifecycle
		// belongs to the host — we never close `this.app` here.
		await this.inner.close();
	}

	getNative<T = unknown>(): T {
		return this.app.getHttpAdapter().getInstance() as T;
	}

	getPort(): number {
		const address = this.app.getHttpServer()?.address();
		if (address && typeof address === 'object') {
			return address.port;
		}
		throw new Error('[kratosjs] Nest server is not listening — call app.listen() first');
	}
}
