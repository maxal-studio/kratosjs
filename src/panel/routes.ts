import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import type { Panel } from '../Panel';
import type { RequestContext } from '../RequestContext';
import { requestContextStorage } from '../RequestContextStorage';
import { authMiddleware, optionalAuthMiddleware } from '../auth/middleware';
import { SchemaController } from './controllers/SchemaController';
import { CrudController } from './controllers/CrudController';
import { RelationController } from './controllers/RelationController';
import { MediaController } from './controllers/MediaController';
import { SearchController } from './controllers/SearchController';
import { PageController } from './controllers/PageController';
import { t } from '../i18n/serverT';

/**
 * Build request context from Express request
 */
function buildRequestContext(panel: Panel, req: Request): RequestContext {
	return {
		user: req.authUser,
		query: req.query as Record<string, any>,
		body: req.body as Record<string, any> | undefined,
		headers: req.headers as Record<string, string | string[] | undefined>,
		resolveMediaUrl: (mediaValue: any) => panel.resolveMediaUrl(mediaValue),
		activeLocale: panel.resolveLocale({
			query: req.query as Record<string, unknown>,
			headers: req.headers as Record<string, string | string[] | undefined>,
		}),
	};
}

/**
 * Build the Express Router with all panel routes.
 * Routes are global with the resource as a URL parameter.
 */
export function buildPanelRouter(panel: Panel): Router {
	const router = Router();

	const schemaController = new SchemaController(panel);
	const crudController = new CrudController(panel);
	const relationController = new RelationController(panel);
	const mediaController = new MediaController(panel);
	const searchController = new SearchController(panel);
	const pageController = new PageController(panel);

	// Create a request-scoped MikroORM context (forked EntityManager) for every request
	router.use(panel.ormContextMiddleware());

	// Resolve the active locale for EVERY route (auth, resource, media…) up front, so
	// server `t()` localizes to the client's locale even on routes that run before the
	// richer resource context (auth login/refresh, auth middleware, resource resolution).
	// The resource `contextRunner` below nests a fuller context (with user) inside this.
	router.use((req: Request, _res: Response, next: NextFunction) => {
		const localeContext: RequestContext = {
			activeLocale: panel.resolveLocale({
				query: req.query as Record<string, unknown>,
				headers: req.headers as Record<string, string | string[] | undefined>,
			}),
			query: req.query as Record<string, any>,
			headers: req.headers as Record<string, string | string[] | undefined>,
		};
		requestContextStorage.run(localeContext, () => next());
	});

	// Apply panel-level middleware
	const panelMiddleware = panel.getMiddleware();
	if (panelMiddleware.length > 0) {
		router.use(...panelMiddleware);
	}

	// Run request inside request-scoped context AFTER auth so context.user (req.authUser) is set
	const contextRunner = (req: Request, _res: Response, next: NextFunction) => {
		const context = buildRequestContext(panel, req);
		requestContextStorage.run(context, () => next());
	};

	// Auth routes (before resource routes)
	const authManager = panel.getAuthManager();
	if (authManager) {
		const getUserById = (authManager as any)._getUserById;
		router.use(
			'/auth',
			// Pass the panel base path so the refresh-token cookie is scoped to the real
			// endpoint (`${basePath}/auth/refresh`), not the bare `/auth/refresh`.
			authManager.getRoutes(getUserById, () => panel.getEm(), panel.getBasePath()),
		);
	}

	// Middleware to resolve resource from URL parameter
	const resolveResource = (req: Request, res: Response, next: () => void) => {
		const resourceSlug = req.params.resource as string;
		const resource = panel.getResource(resourceSlug);

		if (!resource) {
			res.status(404).json({
				message: t('core:resource.not_found', { slug: resourceSlug }),
			});
			return;
		}

		// Attach resource to request
		req.panelResource = resource;
		next();
	};

	// Helper function to register routes with optional auth middleware and resource resolution
	const registerRoute = (
		method: 'get' | 'post' | 'patch' | 'put' | 'delete',
		path: string,
		options: { requiresResource?: boolean } = {},
		...handlers: RequestHandler[]
	) => {
		const middlewares: RequestHandler[] = [];

		// Add auth middleware if configured
		if (authManager) {
			middlewares.push(authMiddleware(authManager));
		}

		// Add resolveResource middleware if this route requires resource resolution
		if (options.requiresResource) {
			middlewares.push(resolveResource);
		}

		// Run rest of chain inside request context after all middlewares (req fully populated)
		middlewares.push(contextRunner);

		// Add handlers
		middlewares.push(...handlers);

		// Register route
		(router as any)[method](path, ...middlewares);
	};

	// Panel metadata endpoint (optional auth, then context, then handler)
	router.get('/meta', optionalAuthMiddleware(authManager), contextRunner, async (req: Request, res: Response) => {
		const metadata = await panel.getMetadata(req.authUser);
		res.json(metadata);
	});

	// Panel badges endpoint (same auth as meta; used for initial load and refresh)
	router.get(
		'/meta/badges',
		optionalAuthMiddleware(authManager),
		contextRunner,
		async (req: Request, res: Response) => {
			const badges = await panel.getBadges(req.authUser);
			res.json(badges);
		},
	);

	// Page routes (before resource routes to avoid conflicts)
	registerRoute('get', '/pages/:page', {}, pageController.handlePageData.bind(pageController));

	// Global search endpoint (before resource routes)
	registerRoute('post', '/global-search', {}, searchController.handleGlobalSearch.bind(searchController));

	// Generic media upload/delete routes (before resource routes to avoid conflicts)
	registerRoute('post', '/media/upload', {}, mediaController.handleUpload.bind(mediaController));
	registerRoute('post', '/media/delete', {}, mediaController.handleDelete.bind(mediaController));

	// Resource routes with :resource parameter (require resource resolution)

	// Schema routes
	registerRoute(
		'get',
		'/:resource/schema/form',
		{ requiresResource: true },
		schemaController.handleFormSchema.bind(schemaController),
	);
	registerRoute(
		'get',
		'/:resource/schema/table',
		{ requiresResource: true },
		schemaController.handleTableSchema.bind(schemaController),
	);

	// CRUD routes
	registerRoute('post', '/:resource', { requiresResource: true }, crudController.handleCreate.bind(crudController));

	// Relations routes (must be before /:resource/:id to avoid route conflict)
	registerRoute(
		'get',
		'/:resource/relations',
		{ requiresResource: true },
		relationController.handleRelations.bind(relationController),
	);
	registerRoute(
		'post',
		'/:resource/:id/relations/:relationName/list',
		{ requiresResource: true },
		relationController.handleRelationData.bind(relationController),
	);
	registerRoute(
		'post',
		'/:resource/:id/relations/:relationName',
		{ requiresResource: true },
		relationController.handleCreateRelation.bind(relationController),
	);
	registerRoute(
		'patch',
		'/:resource/:id/relations/:relationName/:pivotId',
		{ requiresResource: true },
		relationController.handleUpdateRelation.bind(relationController),
	);

	// Media upload/delete routes
	registerRoute(
		'post',
		'/:resource/media/upload',
		{ requiresResource: true },
		mediaController.handleUpload.bind(mediaController),
	);
	registerRoute(
		'post',
		'/:resource/media/delete',
		{ requiresResource: true },
		mediaController.handleDelete.bind(mediaController),
	);

	registerRoute(
		'get',
		'/:resource/:id',
		{ requiresResource: true },
		crudController.handleFindById.bind(crudController),
	);
	registerRoute(
		'post',
		'/:resource/list',
		{ requiresResource: true },
		crudController.handleList.bind(crudController),
	);
	registerRoute(
		'post',
		'/:resource/export',
		{ requiresResource: true },
		crudController.handleExport.bind(crudController),
	);
	registerRoute(
		'post',
		'/:resource/update/:id',
		{ requiresResource: true },
		crudController.handleUpdate.bind(crudController),
	);
	registerRoute(
		'post',
		'/:resource/bulk-delete',
		{ requiresResource: true },
		crudController.handleDelete.bind(crudController),
	);
	registerRoute(
		'post',
		'/:resource/actions',
		{ requiresResource: true },
		crudController.handleAction.bind(crudController),
	);

	return router;
}
