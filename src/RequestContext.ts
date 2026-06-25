import { DataAdapter } from './adapters/database/DataAdapter';
import { AuthUser } from './auth/types';
import { QueryParams } from './resource/types';

/**
 * Context available to both Page.blocks() and Resource operations
 * Provides access to request information like authenticated user, query params, etc.
 */
export interface RequestContext {
	/**
	 * The database adapter instance for the current request.
	 * Use this to build queries in widgets/hooks with the same filters as the list view.
	 * @example
	 * const where = await ctx.databaseAdapter?.buildFiltersQuery(ctx.listParams);
	 * const count = await em.count(entity, { ...where, active: true });
	 */
	databaseAdapter?: DataAdapter;

	/**
	 * The authenticated user (if available)
	 */
	user?: AuthUser;

	/**
	 * Query parameters from the request
	 */
	query: Record<string, any>;

	/**
	 * Request body (if available)
	 */
	body?: Record<string, any>;

	/**
	 * Request headers
	 */
	headers: Record<string, string | string[] | undefined>;

	/**
	 * The active locale resolved for this request (from `?locale`, the
	 * `X-KratosJs-Locale` header, `Accept-Language`, or the panel default).
	 * Read by the server `t()` so translations resolve to the right language.
	 */
	activeLocale?: string;

	/**
	 * Helper to resolve media URLs
	 */
	resolveMediaUrl?: (mediaValue: any) => Promise<string | undefined>;

	/**
	 * Normalized list query parameters for the current request.
	 * Set only during list requests (e.g. POST /:resource/list).
	 * Contains filters, search, sort, queryBuilders, populate, etc.
	 */
	listParams?: QueryParams;

	/**
	 * Additional context data
	 */
	[key: string]: any;
}
