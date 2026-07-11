import type { AdapterInitContext, RouteDefinition, StaticMount } from './types';
import type { AdminSpaService } from './adminSpa';

/**
 * Abstract base class for HTTP server adapters (v2 contract).
 *
 * Implement this to run KratosJs on any HTTP framework (Express, Fastify, ...).
 * The adapter is a pure translation layer: it never sees middleware or routers —
 * core hands it fully composed handlers via a flat, ordered route table.
 *
 * Panel drives the adapter in this fixed order during `start()`:
 *
 *   1. `init(ctx)`          — create the native app; install JSON body parsing
 *                             (ctx.bodyLimit) and CORS (ctx.cors)
 *   2. `useStatic(mount)`   — once per static mount, in registration order
 *   3. `registerRoute(def)` — once per route, in table order; the adapter MUST
 *                             preserve this order as match precedence
 *   4. `serveAdminSpa(spa)` — wire the admin SPA (dev middleware / prod static +
 *                             GET/HEAD catch-all); always last, so API routes win
 *   5. `listen(port)`
 *
 * Per request, the adapter builds a `KratosRequest` (via `buildKratosRequest`),
 * a `KratosReply` (via `createReply` over its `ReplyDriver`), and invokes the
 * route's handler. Nothing else — auth, ORM context, and error handling are
 * already inside the handler.
 */
export abstract class KratosHttpAdapter {
	/** Adapter name for logs/errors, e.g. 'express' */
	abstract readonly name: string;

	/**
	 * Create and configure the native app.
	 * Must install JSON body parsing honoring `ctx.bodyLimit` and CORS per `ctx.cors`.
	 */
	abstract init(ctx: AdapterInitContext): void | Promise<void>;

	/**
	 * Map one route onto the native router. Called in route-table order;
	 * earlier routes must win when multiple patterns match a request.
	 */
	abstract registerRoute(route: RouteDefinition): void;

	/** Serve static files from a directory at a URL path. */
	abstract useStatic(mount: StaticMount): void;

	/**
	 * Wire the admin SPA. Development: mount `spa.createDevServer()` connect
	 * middlewares + a GET/HEAD catch-all rendering `renderIndexHtml(url)`.
	 * Production: serve `spa.adminDistDir` assets + a GET/HEAD catch-all
	 * sending `spa.getIndexHtml()`.
	 */
	abstract serveAdminSpa(spa: AdminSpaService): void | Promise<void>;

	/** Start listening. Resolves once the server accepts connections. */
	abstract listen(port: number, callback?: () => void): Promise<void>;

	/**
	 * The port the server is listening on. With `listen(0)` this returns the
	 * OS-assigned port — required so the contract test suite can run against
	 * any adapter on an ephemeral port.
	 */
	abstract getPort(): number;

	/** Stop the server (and any dev server started by serveAdminSpa). */
	abstract close(): Promise<void>;

	/** Escape hatch: the framework-native app instance. */
	abstract getNative<T = unknown>(): T;
}
