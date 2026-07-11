import type { Express } from 'express';
import type { Panel } from '@maxal_studio/kratosjs';

export { ExpressAdapter } from './ExpressAdapter.js';
export type { ExpressAdapterOptions } from './ExpressAdapter.js';
export { ExpressReplyDriver, toKratosRequest } from './driver.js';
export type { Express };

/**
 * Typed escape hatch: get the raw Express app from a panel configured with the
 * ExpressAdapter. Use it to register raw Express routes/middleware that need
 * more than the framework-neutral `panel.registerRoute()` API.
 *
 * @example
 * ```typescript
 * const app = getExpressApp(panel);
 * app.get('/custom', (req, res) => res.send('raw express'));
 * ```
 */
export function getExpressApp(panel: Panel): Express {
	return panel.getServer<Express>();
}
