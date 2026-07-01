import express, { Express, RequestHandler, Router } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { HttpAdapter } from './HttpAdapter.js';
import { Panel } from '../../Panel.js';
import ViteExpress from 'vite-express';
import path from 'path';
import fs from 'fs';
import { hasAdminClientEntry, resolveAppViteConfig, scaffoldAdminClient } from '../../scaffold/adminClient.js';

/**
 * Express implementation of HttpAdapter
 * Default HTTP adapter for Panel
 */
export class ExpressAdapter extends HttpAdapter {
	private app: Express;
	private _panelRoutesMounted: boolean = false;
	private _staticMounts = new Set<string>();

	/**
	 * Create a new ExpressAdapter instance
	 * @param panel - The Panel instance
	 * @param basePath - Base URL path for all routes
	 */
	constructor(panel: Panel, basePath: string) {
		super(panel, basePath);
		this.app = express();
		this.setupDefaultMiddlewares();
	}

	/**
	 * Get the Express app instance
	 * @returns Express application instance
	 */
	getApp(): Express {
		return this.app;
	}

	/**
	 * Setup default middlewares
	 * Registers cors, cookieParser, and express.json
	 */
	setupDefaultMiddlewares(): void {
		this.app.use(
			cors({
				origin: true, // Allow all origins (or specify your frontend URL)
				credentials: true, // Allow cookies to be sent
			}),
		);
		this.app.use(cookieParser());
		this.app.use(express.json({ limit: '50mb' })); // Increase limit for base64 file uploads
	}

	/**
	 * Register a route with automatic base path, auth, and media helpers
	 * @param method - HTTP method (get, post, put, patch, delete)
	 * @param path - Route path (will be prepended with basePath)
	 * @param handlers - Route handler functions
	 */
	registerRoute(
		method: 'get' | 'post' | 'put' | 'patch' | 'delete',
		path: string,
		...handlers: RequestHandler[]
	): void {
		const fullPath = `${this.basePath}${path}`;
		const middlewares: RequestHandler[] = [];

		// Create a request-scoped MikroORM context (forked EntityManager)
		middlewares.push(this.panel.ormContextMiddleware());

		// Add auth middleware if configured
		if (this.panel.getAuthManager()) {
			middlewares.push(this.panel.attachAuth());
		}

		// Add media helpers
		middlewares.push(this.panel.attachMediaHelpers());

		// Add custom handlers
		middlewares.push(...handlers);

		// Register route (will be registered AFTER panel routes since panel routes are mounted first)
		(this.app as any)[method](fullPath, ...middlewares);
	}

	/**
	 * Mount a router at a specific path
	 * @param path - Mount path
	 * @param router - Express Router instance to mount
	 */
	mountRouter(path: string, router: Router): void {
		// Only mount panel routes once
		if (path === this.basePath && this._panelRoutesMounted) {
			return;
		}

		this.app.use(path, router);

		if (path === this.basePath) {
			this._panelRoutesMounted = true;
		}
	}

	/**
	 * Serve static files from a directory
	 * @param path - URL path to serve files from
	 * @param directory - Directory path to serve files from
	 */
	useStatic(path: string, directory: string): void {
		this._staticMounts.add(path);
		// Serve static files BEFORE vite-express to ensure they're not caught by the React app fallback
		// This is important for component bundles at /components/*
		this.app.use(path, express.static(directory));
	}

	hasStaticMount(path: string): boolean {
		return this._staticMounts.has(path);
	}

	/**
	 * Transform the admin index.html: inject panel title, favicon, and settings.
	 * Used in development (vite-express transformer) and production (static HTML).
	 */
	private transformIndexHtml(html: string): string {
		const panel = this.panel;

		// Replace the title placeholder with the panel title
		const panelTitle = panel.getTitle();
		if (panelTitle) {
			html = html.replace('<!-- VALAJS_PANEL_TITLE -->', `<title>${panelTitle}</title>`);
		} else {
			html = html.replace('<!-- VALAJS_PANEL_TITLE -->', '<title>KratosJs Admin Panel</title>');
		}

		// Replace the favicon placeholder with the panel favicon
		const panelFavicon = panel.getFavicon();
		if (panelFavicon) {
			const faviconExt = panelFavicon.split('.').pop()?.toLowerCase();
			let faviconType = 'image/svg+xml'; // default
			if (faviconExt === 'ico') {
				faviconType = 'image/x-icon';
			} else if (faviconExt === 'png') {
				faviconType = 'image/png';
			} else if (faviconExt === 'jpg' || faviconExt === 'jpeg') {
				faviconType = 'image/jpeg';
			}
			html = html.replace(
				'<!-- VALAJS_PANEL_FAVICON -->',
				`<link rel="icon" type="${faviconType}" href="${panelFavicon}" />`,
			);
		} else {
			html = html.replace('<!-- VALAJS_PANEL_FAVICON -->', ``);
		}

		// Inject panel settings
		const basePath = panel.getBasePath();
		// Serialize the i18n config as JSON; escape `<` so a translation value can't
		// break out of the <script> tag (e.g. a stray "</script>" in a catalog).
		const i18nJson = JSON.stringify(panel.getClientI18nConfig()).replace(/</g, '\\u003c');
		const settingsScript = `
			<script>
				// Panel settings injected by server
				window.__VALAJS_API_BASE_PATH__ = '${basePath}';
				window.__VALAJS_I18N__ = ${i18nJson};
			</script>`;
		html = html.replace('<!-- VALAJS_PANEL_SETTINGS -->', settingsScript);

		return html;
	}

	/**
	 * Start the HTTP server.
	 *
	 * Production (NODE_ENV=production): requires a built admin client in dist/admin.
	 * Development: serves the app's admin client through vite-express with HMR.
	 * Auto-scaffolds index.html, vite.config.mts, and src/admin/main.tsx when missing.
	 */
	start(port: number, callback?: () => void): void {
		const appRoot = process.cwd();
		const adminDist = path.join(appRoot, 'dist', 'admin');
		const isProduction = process.env.NODE_ENV === 'production';

		if (isProduction) {
			if (!fs.existsSync(path.join(adminDist, 'index.html'))) {
				throw new Error(
					`[kratosjs] NODE_ENV=production but no admin build found at ${adminDist}.\n` +
						'Run "vite build" (or "npm run build:admin") in your app to create the production admin bundle.',
				);
			}
			this.startProduction(adminDist, port, callback);
			return;
		}

		this.startDevelopment(port, callback);
	}

	/**
	 * Serve the pre-built admin SPA (vite build output) statically.
	 */
	private startProduction(adminDist: string, port: number, callback?: () => void): void {
		const indexHtml = this.transformIndexHtml(fs.readFileSync(path.join(adminDist, 'index.html'), 'utf-8'));

		// Hashed assets (JS/CSS/images) — served before the SPA fallback
		this.app.use(express.static(adminDist, { index: false }));

		// SPA fallback: any remaining GET request (API routes are mounted earlier)
		this.app.use((req, res, next) => {
			if (req.method !== 'GET' && req.method !== 'HEAD') {
				return next();
			}
			res.type('html').send(indexHtml);
		});

		this.app.listen(port, callback);
	}

	/**
	 * Serve the admin SPA through vite-express (dev mode with HMR).
	 * Auto-scaffolds the standard admin client files when the app entry is missing.
	 */
	private startDevelopment(port: number, callback?: () => void): void {
		const appRoot = process.cwd();

		if (!hasAdminClientEntry(appRoot)) {
			const result = scaffoldAdminClient(appRoot);
			if (result.created.length > 0) {
				console.log('[kratosjs] Auto-scaffolded admin client files:');
				for (const file of result.created) {
					console.log(`  + ${file}`);
				}
			}
		}

		const viteConfigFile = resolveAppViteConfig(appRoot);

		ViteExpress.config({
			mode: 'development',
			viteConfigFile,
			transformer: (html: string, _req: express.Request) => this.transformIndexHtml(html),
		});

		ViteExpress.listen(this.app, port, callback);
	}

	/**
	 * Get all registered routes from the Express app
	 * @returns Array of route objects with method and path
	 */
	getRegisteredRoutes(): Array<{ method: string; path: string }> {
		const routes: Array<{ method: string; path: string }> = [];

		// Recursively extract routes from router stack (handles nested routers like auth routes)
		const extractRoutes = (stack: any[], basePath: string = '') => {
			if (!stack || !Array.isArray(stack)) {
				return;
			}

			stack.forEach((layer: any) => {
				if (!layer) return;

				// Direct route
				if (layer.route) {
					const route = layer.route as any;
					const methods = Object.keys(route.methods || {});
					const path = basePath + (route.path || '');
					if (methods.length > 0) {
						routes.push({ method: methods[0].toUpperCase(), path });
					}
				}
				// Nested router (like auth routes mounted at /auth, or panel routes mounted at basePath)
				else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
					// Try to extract the mount path from the regexp
					let mountPath = '';
					if (layer.regexp) {
						// Express router regexp for '/auth' looks like: /^\/auth\/?(?=\/|$)/
						// The source is: ^\/auth\/?(?=\/|$)
						const regexpStr = layer.regexp.source;
						// Extract path from regexp pattern: match ^\/auth or ^\\\/auth
						// Pattern matches: ^ followed by optional backslash, then forward slash, then path name
						const pathMatch = regexpStr.match(/\^\\?\/+([^\\/?(]+)/);
						if (pathMatch) {
							mountPath = '/' + pathMatch[1].replace(/\\/g, '');
						}
					}
					const fullPath = basePath + mountPath;
					extractRoutes(layer.handle.stack, fullPath);
				}
				// Middleware layer (might contain nested routes)
				else if (layer.handle && typeof layer.handle === 'function' && (layer.handle as any).stack) {
					// This might be a mounted router
					let mountPath = '';
					if (layer.regexp) {
						const regexpStr = layer.regexp.source;
						const pathMatch = regexpStr.match(/\^\\?\/+([^\\/?(]+)/);
						if (pathMatch) {
							mountPath = '/' + pathMatch[1].replace(/\\/g, '');
						}
					}
					const fullPath = basePath + mountPath;
					extractRoutes((layer.handle as any).stack, fullPath);
				}
			});
		};

		// Access Express app's router stack
		// Try different ways to access the router stack (Express 4 vs 5)
		let routerStack: any[] | null = null;

		if (this.app) {
			const appInternal = this.app as any;
			// Express 4/5: _router.stack (most common)
			if (appInternal._router && appInternal._router.stack) {
				routerStack = appInternal._router.stack;
			}
			// Alternative: router property
			else if (appInternal.router && appInternal.router.stack) {
				routerStack = appInternal.router.stack;
			}
		}

		if (routerStack && routerStack.length > 0) {
			// Start extraction from root (empty basePath)
			// The mounted routers will be found and their paths extracted
			extractRoutes(routerStack, '');
		}

		return routes;
	}
}
