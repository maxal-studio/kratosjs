import fs from 'fs';
import path from 'path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Panel } from '../Panel';
import { hasAdminClientEntry, resolveAppViteConfig, scaffoldAdminClient } from '../scaffold/adminClient';

/**
 * Connect-style middleware (what `vite.createServer({server:{middlewareMode:true}})`
 * exposes). Express consumes it directly with `app.use`; Fastify via `@fastify/middie`.
 */
export type ConnectMiddleware = (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => void;

export interface AdminSpaDevServer {
	/** Vite's connect middlewares — mount before the SPA catch-all */
	middlewares: ConnectMiddleware;
	/** Read the app index.html, run vite + panel HTML transforms for the given URL */
	renderIndexHtml(url: string): Promise<string>;
	/** Load an ESM module through Vite's SSR pipeline (used by the Views SSR renderer). */
	ssrLoadModule(url: string): Promise<Record<string, any>>;
	/** Run Vite's index.html transform (HMR client + react-refresh preamble) on arbitrary HTML. */
	transformIndexHtml(url: string, html: string): Promise<string>;
	/** Rewrite an error's stack to map back to original source (SSR dev ergonomics). */
	ssrFixStacktrace(err: Error): void;
	close(): Promise<void>;
}

/**
 * Framework-agnostic admin SPA serving.
 *
 * Owns everything about the admin client that is panel logic rather than HTTP
 * framework logic: index.html transformation (title, favicon, injected
 * `window.__VALAJS_API_BASE_PATH__` / `window.__VALAJS_I18N__` settings), the
 * production static bundle, and the Vite dev server (middleware mode — this is
 * what replaces vite-express). Adapters consume it in `serveAdminSpa()`.
 */
export class AdminSpaService {
	readonly mode: 'development' | 'production';

	/** PROD: directory of hashed assets (serve statically with index disabled) */
	readonly adminDistDir?: string;

	/** Admin UI mount path (normalized). '/' means whole-domain catch-all. */
	readonly panelPath: string;

	/**
	 * Whether the admin SPA fallback is active. When false (admin client disabled but
	 * the Views system needs the shared dev server), the Vite middlewares are still
	 * mounted but no catch-all HTML fallback is served.
	 */
	readonly spaEnabled: boolean;

	private readonly panel: Panel;
	private readonly appRoot: string;
	private cachedIndexHtml?: string;
	private devServer?: AdminSpaDevServer;

	constructor(
		panel: Panel,
		options: {
			appRoot?: string;
			mode?: 'development' | 'production';
			panelPath?: string;
			spaEnabled?: boolean;
		} = {},
	) {
		this.panel = panel;
		this.appRoot = options.appRoot ?? process.cwd();
		this.panelPath = normalizePanelPath(options.panelPath ?? panel.getPanelPath());
		this.mode = options.mode ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
		this.spaEnabled = options.spaEnabled ?? true;

		if (this.mode === 'production' && this.spaEnabled) {
			const adminDist = path.join(this.appRoot, 'dist', 'admin');
			if (!fs.existsSync(path.join(adminDist, 'index.html'))) {
				throw new Error(
					`[kratosjs] NODE_ENV=production but no admin build found at ${adminDist}.\n` +
						'Run "vite build" (or "npm run build:admin") in your app to create the production admin bundle.',
				);
			}
			this.adminDistDir = adminDist;
		}
	}

	/**
	 * Transform the admin index.html: inject panel title, favicon, and settings.
	 * Used in development (per-request, after vite's own transform) and production
	 * (once at boot on the built index.html).
	 */
	transformIndexHtml(html: string): string {
		return transformAdminIndexHtml(this.panel, html);
	}

	/**
	 * PROD: the fully transformed index.html for the SPA catch-all.
	 * Read and transformed once, then cached.
	 */
	getIndexHtml(): string {
		if (this.mode !== 'production' || !this.adminDistDir) {
			throw new Error('[kratosjs] getIndexHtml() is only available in production mode');
		}
		if (this.cachedIndexHtml === undefined) {
			const raw = fs.readFileSync(path.join(this.adminDistDir, 'index.html'), 'utf-8');
			// The client is built with a relative base ('./'), so rewrite its asset URLs
			// to absolute under the panel path — this is what lets the panel path be
			// configured on the backend alone (no Vite `base` in the app's config).
			this.cachedIndexHtml = this.transformIndexHtml(this.rewriteAssetBaseToPanelPath(raw));
		}
		return this.cachedIndexHtml;
	}

	/**
	 * Rewrite a relative-base build's asset URLs (`src="./assets/x.js"`) to absolute under
	 * the panel path (`/admin/assets/x.js`, or `/assets/x.js` at root). Only build asset
	 * URLs use `./` in the raw HTML; the title/favicon/settings are injected afterwards via
	 * placeholders. An already-absolute (`/assets/`) build has no `./` to match and is left
	 * intact.
	 */
	private rewriteAssetBaseToPanelPath(html: string): string {
		const absBase = this.panelPath === '/' ? '/' : `${this.panelPath}/`;
		return html.replace(/(\s(?:src|href)=")\.\//g, `$1${absBase}`);
	}

	/**
	 * DEV: create the Vite dev server in middleware mode (HMR included).
	 * Auto-scaffolds the standard admin client files when missing, exactly like v1.
	 * Vite is imported lazily so production runtime never loads it.
	 */
	async createDevServer(): Promise<AdminSpaDevServer> {
		if (this.mode !== 'development') {
			throw new Error('[kratosjs] createDevServer() is only available in development mode');
		}
		if (this.devServer) {
			return this.devServer;
		}

		if (!hasAdminClientEntry(this.appRoot)) {
			const result = scaffoldAdminClient(this.appRoot);
			if (result.created.length > 0) {
				console.log('[kratosjs] Auto-scaffolded admin client files:');
				for (const file of result.created) {
					console.log(`  + ${file}`);
				}
			}
		}

		const viteConfigFile = resolveAppViteConfig(this.appRoot);
		const { createServer } = await import('vite');

		const vite = await createServer({
			configFile: viteConfigFile,
			// Force the dev base from the panel path (inline config overrides the config
			// file), so Vite serves modules + injects the client under the panel path and
			// the app's vite.config needs no `base`.
			base: this.viteBase(),
			appType: 'custom',
			server: { middlewareMode: true },
		});

		this.devServer = {
			middlewares: vite.middlewares as unknown as ConnectMiddleware,
			renderIndexHtml: async (url: string): Promise<string> => {
				const raw = fs.readFileSync(path.join(this.appRoot, 'index.html'), 'utf-8');
				const viteHtml = await vite.transformIndexHtml(url, raw);
				return this.transformIndexHtml(viteHtml);
			},
			ssrLoadModule: (url: string) => vite.ssrLoadModule(url),
			transformIndexHtml: (url: string, html: string) => vite.transformIndexHtml(url, html),
			ssrFixStacktrace: (err: Error) => vite.ssrFixStacktrace(err),
			close: async (): Promise<void> => {
				await vite.close();
			},
		};

		return this.devServer;
	}

	/**
	 * The SPA catch-all applies only to GET/HEAD requests whose path is under the
	 * panel path — everything else falls through (404 / the app's own routes).
	 */
	shouldFallback(method: string, pathname: string): boolean {
		if (!this.spaEnabled) {
			return false;
		}
		const upper = method.toUpperCase();
		return (upper === 'GET' || upper === 'HEAD') && this.isUnderPanelPath(pathname);
	}

	/** The Vite `base` for this panel path — '/' at root, else '/admin/' (trailing slash). */
	viteBase(): string {
		return this.panelPath === '/' ? '/' : `${this.panelPath}/`;
	}

	/** True when `pathname` is at or under the panel path (always true when root). */
	isUnderPanelPath(pathname: string): boolean {
		if (this.panelPath === '/') {
			return true;
		}
		return pathname === this.panelPath || pathname.startsWith(`${this.panelPath}/`);
	}

	/**
	 * Strip the panel path prefix so `/admin/assets/app.js` maps to `assets/app.js`
	 * inside `adminDistDir`. Returns the path (leading slash removed) unchanged when root.
	 */
	assetRelativePath(pathname: string): string {
		const stripped = this.panelPath === '/' ? pathname : pathname.slice(this.panelPath.length);
		return stripped.replace(/^\/+/, '');
	}

	/** Close the dev server if one was created. */
	async close(): Promise<void> {
		if (this.devServer) {
			await this.devServer.close();
			this.devServer = undefined;
		}
	}
}

/**
 * Inject panel title, favicon, and client settings into the admin index.html.
 * The `window.__VALAJS_API_BASE_PATH__` / `window.__VALAJS_I18N__` globals injected
 * here are what the React admin client reads at boot — every adapter must serve
 * HTML that went through this transform.
 */
export function transformAdminIndexHtml(panel: Panel, html: string): string {
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
	const panelPath = panel.getPanelPath();
	// Serialize the i18n config as JSON; escape `<` so a translation value can't
	// break out of the <script> tag (e.g. a stray "</script>" in a catalog).
	const i18nJson = JSON.stringify(panel.getClientI18nConfig()).replace(/</g, '\\u003c');
	const settingsScript = `
			<script>
				// Panel settings injected by server
				window.__VALAJS_API_BASE_PATH__ = '${basePath}';
				window.__VALAJS_PANEL_PATH__ = '${panelPath}';
				window.__VALAJS_I18N__ = ${i18nJson};
			</script>`;
	html = html.replace('<!-- VALAJS_PANEL_SETTINGS -->', settingsScript);

	return html;
}

/**
 * Normalize an admin UI mount path: empty / undefined / '/' → '/' (root, no basename);
 * otherwise exactly one leading slash and no trailing slash (e.g. 'admin' and '/admin/'
 * both become '/admin').
 */
export function normalizePanelPath(input: string | undefined | null): string {
	const trimmed = (input ?? '').trim();
	if (!trimmed || trimmed === '/') {
		return '/';
	}
	return `/${trimmed.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}
