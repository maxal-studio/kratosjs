import type { Server } from '@hapi/hapi';
import type { Panel } from '@maxal_studio/kratosjs';

export { HapiAdapter } from './HapiAdapter.js';
export type { HapiAdapterOptions } from './HapiAdapter.js';
export { HapiReplyDriver, toKratosRequest } from './driver.js';
export type { Server as HapiServer };

/**
 * Typed escape hatch: get the raw Hapi server from a panel configured with the
 * HapiAdapter. Use it to register raw Hapi routes/plugins that need more than the
 * framework-neutral `panel.registerRoute()` API.
 *
 * Register raw routes BEFORE `panel.start()` — Hapi forbids adding routes after
 * the server starts, and the admin SPA fallback is wired last.
 *
 * @example
 * ```typescript
 * const server = getHapiApp(panel);
 * server.route({ method: 'GET', path: '/custom', handler: () => ({ raw: 'hapi' }) });
 * ```
 */
export function getHapiApp(panel: Panel): Server {
	return panel.getServer<Server>();
}
