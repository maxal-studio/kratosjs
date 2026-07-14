import type {
	KratosHandler,
	KratosMiddleware,
	KratosRequest,
	KratosReply,
	KratosRouteHandler,
	RouteDefinition,
} from './types';
import { handleError } from './errors';
import type { Panel } from '../Panel';
import type { RequestContext } from '../RequestContext';
import { requestContextStorage } from '../RequestContextStorage';
import { authMiddleware, optionalAuthMiddleware } from '../auth/middleware';
import { SchemaController } from '../panel/controllers/SchemaController';
import { CrudController } from '../panel/controllers/CrudController';
import { RelationController } from '../panel/controllers/RelationController';
import { MediaController } from '../panel/controllers/MediaController';
import { SearchController } from '../panel/controllers/SearchController';
import { PageController } from '../panel/controllers/PageController';
import { t } from '../i18n/serverT';

/**
 * Compose middleware steps and a final handler into ONE neutral handler.
 *
 * This is the heart of the pluggable-HTTP design: core composes the whole
 * per-route pipeline (ORM context, locale context, auth, resource resolution,
 * request context, controller) into a single function, so adapters never
 * implement middleware ordering, short-circuiting, or error propagation.
 *
 * Semantics:
 * - Steps run in order; a step continues the chain by awaiting `next()`.
 * - A step that responds (reply.sent) without calling `next()` short-circuits;
 *   the chain also stops early if a step responded before calling `next()`.
 * - `next()` returns a promise, so AsyncLocalStorage wrappers
 *   (`requestContextStorage.run(ctx, () => next())`) and MikroORM's
 *   `RequestContext.create(em, next)` hold across the entire downstream chain.
 * - Any error thrown by a step or the handler is mapped by {@link handleError}
 *   unless a response was already sent.
 */
export function composeHandler(steps: KratosMiddleware[], handler: KratosHandler): KratosHandler {
	return async (req: KratosRequest, reply: KratosReply): Promise<void> => {
		let lastIndex = -1;

		const dispatch = async (index: number): Promise<void> => {
			if (index <= lastIndex) {
				throw new Error('[kratosjs] next() called multiple times in the same middleware');
			}
			lastIndex = index;

			if (reply.sent) {
				return;
			}

			if (index === steps.length) {
				await handler(req, reply);
				return;
			}

			await steps[index](req, reply, () => dispatch(index + 1));
		};

		try {
			await dispatch(0);
		} catch (error) {
			if (!reply.sent) {
				handleError(reply, error);
			} else {
				console.error('[kratosjs] Unhandled error after response was sent:', error);
			}
		}
	};
}

// ============================================================================
// Panel pipeline
// ============================================================================

/**
 * Build the framework-neutral RequestContext from a KratosRequest.
 * (Moved unchanged from the v1 routes.ts — the context shape is unchanged.)
 */
function buildRequestContext(panel: Panel, req: KratosRequest): RequestContext {
	return {
		user: req.authUser,
		query: req.query,
		body: req.body as Record<string, any> | undefined,
		headers: req.headers,
		resolveMediaUrl: (mediaValue: any) => panel.resolveMediaUrl(mediaValue),
		activeLocale: panel.resolveLocale({
			query: req.query as Record<string, unknown>,
			headers: req.headers,
		}),
	};
}

/**
 * Locale-only request context, established for EVERY route (auth, resource, media…)
 * up front so server `t()` localizes even on routes that run before the richer
 * resource context. The full `contextRunner` below nests a fuller context inside this.
 */
export function localeContextStep(panel: Panel): KratosMiddleware {
	return async (req, _reply, next) => {
		const localeContext: RequestContext = {
			activeLocale: panel.resolveLocale({
				query: req.query as Record<string, unknown>,
				headers: req.headers,
			}),
			query: req.query,
			headers: req.headers,
		};
		await requestContextStorage.run(localeContext, () => next());
	};
}

/** Run the rest of the chain inside the full request context (after auth populated req.authUser). */
export function contextRunnerStep(panel: Panel): KratosMiddleware {
	return async (req, _reply, next) => {
		const context = buildRequestContext(panel, req);
		await requestContextStorage.run(context, () => next());
	};
}

/** Resolve `/:resource/...` routes to a registered resource, 404 otherwise. */
function resolveResourceStep(panel: Panel): KratosMiddleware {
	return async (req, reply, next) => {
		const resourceSlug = req.params.resource;
		const resource = panel.getResource(resourceSlug);

		if (!resource) {
			reply.status(404).json({
				message: t('core:resource.not_found', { slug: resourceSlug }),
			});
			return;
		}

		req.panelResource = resource;
		await next();
	};
}

export interface PanelPipelineOptions {
	auth: 'required' | 'optional' | 'none';
	requiresResource?: boolean;
}

/**
 * Compose a controller handler with the standard panel pipeline, replicating the
 * exact v1 order: ORM context → locale context → panel middleware → auth →
 * resource resolution → full request context → handler.
 */
export function composePanelHandler(
	panel: Panel,
	handler: KratosHandler,
	options: PanelPipelineOptions,
): KratosHandler {
	const steps: KratosMiddleware[] = [];

	// Request-scoped MikroORM context (forked EntityManager) for every request
	steps.push(panel.ormContextStep());

	// Locale context for every route (so t() localizes early)
	steps.push(localeContextStep(panel));

	// Panel-level middleware (logging, rate limiting, ...)
	steps.push(...panel.getMiddleware());

	// Auth
	const authManager = panel.getAuthManager();
	if (options.auth === 'required' && authManager) {
		steps.push(authMiddleware(authManager));
	} else if (options.auth === 'optional') {
		steps.push(optionalAuthMiddleware(authManager));
	}

	// Resource resolution for /:resource/... routes
	if (options.requiresResource) {
		steps.push(resolveResourceStep(panel));
	}

	// Full request context AFTER auth so context.user is set
	steps.push(contextRunnerStep(panel));

	return composeHandler(steps, handler);
}

/**
 * Compose a custom route registered via `panel.registerRoute()` (app or plugin).
 * v1 semantics preserved: auth is REQUIRED when auth is configured, and all but the
 * last handler act as middleware. New in v2: the locale + request context are
 * established, so `t()` and `getRequestContext()` work inside custom routes.
 */
export function composeCustomRouteHandler(panel: Panel, handlers: KratosRouteHandler[]): KratosHandler {
	const steps: KratosMiddleware[] = [];

	steps.push(panel.ormContextStep());
	steps.push(localeContextStep(panel));

	const authManager = panel.getAuthManager();
	if (authManager) {
		steps.push(authMiddleware(authManager));
	}

	steps.push(contextRunnerStep(panel));

	// All but the last user handler act as middleware (may call next())
	const middlewareHandlers = handlers.slice(0, -1) as KratosMiddleware[];
	const finalHandler = handlers[handlers.length - 1] as KratosHandler;
	steps.push(...middlewareHandlers);

	return composeHandler(steps, finalHandler);
}

/**
 * Build the panel's declarative route table — every framework endpoint with its
 * fully composed handler, paths already prefixed with the panel base path.
 * Replaces the v1 Express `buildPanelRouter`. Order matters: adapters register
 * routes in table order and MUST preserve it as match precedence.
 */
export function buildPanelRouteTable(panel: Panel): RouteDefinition[] {
	const basePath = panel.getBasePath();
	const routes: RouteDefinition[] = [];

	const schemaController = new SchemaController(panel);
	const crudController = new CrudController(panel);
	const relationController = new RelationController(panel);
	const mediaController = new MediaController(panel);
	const searchController = new SearchController(panel);
	const pageController = new PageController(panel);

	const add = (
		method: RouteDefinition['method'],
		path: string,
		handler: KratosHandler,
		options: PanelPipelineOptions,
		source: RouteDefinition['source'] = 'panel',
	) => {
		routes.push({
			method,
			path: `${basePath}${path}`,
			handler: composePanelHandler(panel, handler, options),
			source,
		});
	};

	// Panel metadata + badges (optional auth)
	add(
		'GET',
		'/meta',
		async (req, reply) => {
			const metadata = await panel.getMetadata(req.authUser);
			reply.json(metadata);
		},
		{ auth: 'optional' },
	);
	add(
		'GET',
		'/meta/badges',
		async (req, reply) => {
			const badges = await panel.getBadges(req.authUser);
			reply.json(badges);
		},
		{ auth: 'optional' },
	);

	// Auth routes (before resource routes). No auth requirement; the ORM/locale
	// steps and panel middleware still apply (v1 parity).
	const authManager = panel.getAuthManager();
	if (authManager) {
		// Pass the panel base path so the refresh-token cookie is scoped to the real
		// endpoint (`${basePath}/auth/refresh`), not the bare `/auth/refresh`.
		const getUserById = (authManager as any)._getUserById;
		const authRoutes = authManager.getRouteDefinitions(getUserById, () => panel.getEm(), basePath);
		for (const authRoute of authRoutes) {
			add(authRoute.method, `/auth${authRoute.path}`, authRoute.handler, { auth: 'none' }, 'auth');
		}
	}

	// Page routes (before resource routes to avoid conflicts)
	add('GET', '/pages/:page', pageController.handlePageData.bind(pageController), { auth: 'required' });

	// Global search endpoint (before resource routes)
	add('POST', '/global-search', searchController.handleGlobalSearch.bind(searchController), { auth: 'required' });

	// Generic media upload/delete routes (before resource routes to avoid conflicts)
	add('POST', '/media/upload', mediaController.handleUpload.bind(mediaController), { auth: 'required' });
	add('POST', '/media/delete', mediaController.handleDelete.bind(mediaController), { auth: 'required' });

	// Resource routes with :resource parameter (require resource resolution)
	const resource = { auth: 'required' as const, requiresResource: true };

	// Schema routes
	add('GET', '/:resource/schema/form', schemaController.handleFormSchema.bind(schemaController), resource);
	add('GET', '/:resource/schema/table', schemaController.handleTableSchema.bind(schemaController), resource);

	// CRUD routes
	add('POST', '/:resource', crudController.handleCreate.bind(crudController), resource);

	// Relations routes (must be before /:resource/:id to avoid route conflict)
	add('GET', '/:resource/relations', relationController.handleRelations.bind(relationController), resource);
	add(
		'POST',
		'/:resource/:id/relations/:relationName/list',
		relationController.handleRelationData.bind(relationController),
		resource,
	);
	add(
		'POST',
		'/:resource/:id/relations/:relationName',
		relationController.handleCreateRelation.bind(relationController),
		resource,
	);
	add(
		'PATCH',
		'/:resource/:id/relations/:relationName/:pivotId',
		relationController.handleUpdateRelation.bind(relationController),
		resource,
	);

	// Media upload/delete routes
	add('POST', '/:resource/media/upload', mediaController.handleUpload.bind(mediaController), resource);
	add('POST', '/:resource/media/delete', mediaController.handleDelete.bind(mediaController), resource);

	add('GET', '/:resource/:id', crudController.handleFindById.bind(crudController), resource);
	add('POST', '/:resource/list', crudController.handleList.bind(crudController), resource);
	add('POST', '/:resource/export', crudController.handleExport.bind(crudController), resource);
	add('POST', '/:resource/update/:id', crudController.handleUpdate.bind(crudController), resource);
	add('POST', '/:resource/bulk-delete', crudController.handleDelete.bind(crudController), resource);
	add('POST', '/:resource/actions', crudController.handleAction.bind(crudController), resource);

	return routes;
}
