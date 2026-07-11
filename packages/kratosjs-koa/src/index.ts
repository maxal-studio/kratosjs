import type Koa from 'koa';
import type { Panel } from '@maxal_studio/kratosjs';

export { KoaAdapter } from './KoaAdapter.js';
export type { KoaAdapterOptions } from './KoaAdapter.js';
export { KoaReplyDriver, toKratosRequest } from './driver.js';
export type { Koa };

/**
 * Typed escape hatch: get the raw Koa app from a panel configured with the
 * KoaAdapter. Use it to add raw Koa middleware (bring your own `@koa/router` for
 * routes) that needs more than the framework-neutral `panel.registerRoute()` API.
 *
 * Add middleware BEFORE `panel.start()` — the adapter assembles its own stack
 * (body parser, CORS, router, admin SPA) when the server starts, and yours runs
 * ahead of it.
 *
 * @example
 * ```typescript
 * const app = getKoaApp(panel);
 * app.use(async (ctx, next) => {
 *   if (ctx.path === '/raw') { ctx.body = { raw: 'koa' }; return; }
 *   await next();
 * });
 * ```
 */
export function getKoaApp(panel: Panel): Koa {
	return panel.getServer<Koa>();
}
