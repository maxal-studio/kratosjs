import type { FastifyInstance } from 'fastify';
import type { Panel } from '@maxal_studio/kratosjs';

export { FastifyAdapter } from './FastifyAdapter.js';
export type { FastifyAdapterOptions } from './FastifyAdapter.js';
export { FastifyReplyDriver, toKratosRequest } from './driver.js';
export type { FastifyInstance };

/**
 * Typed escape hatch: get the raw Fastify instance from a panel configured with
 * the FastifyAdapter. Use it to register raw fastify routes/plugins that need
 * more than the framework-neutral `panel.registerRoute()` API.
 *
 * Register raw routes BEFORE `panel.start()` (fastify forbids adding routes
 * after listen, and the admin SPA fallback is wired last).
 *
 * @example
 * ```typescript
 * const app = getFastifyApp(panel);
 * app.get('/custom', async () => ({ raw: 'fastify' }));
 * ```
 */
export function getFastifyApp(panel: Panel): FastifyInstance {
	return panel.getServer<FastifyInstance>();
}
