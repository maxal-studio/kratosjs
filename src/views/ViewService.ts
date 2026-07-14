import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { pathToFileURL } from 'url';
import type { KratosReply, KratosRequest } from '../http/types';
import type { Panel } from '../Panel';
import type { AdminSpaDevServer } from '../http/adminSpa';
import type { ResolvedViewsConfig, ViewReplyOptions } from './types';
import {
	CSRF_COOKIE,
	FLASH_COOKIE,
	VIEW_COMPONENT_HEADER,
	VIEW_EXCEPT_HEADER,
	VIEW_HEADER,
	VIEW_LOCATION_HEADER,
	VIEW_ONLY_HEADER,
	VIEW_RESPONSE_HEADER,
	VIEW_VERSION_HEADER,
	VIEW_PAGE_ELEMENT_ID,
	type ViewPage,
	parseHeaderList,
	resolveProps,
	serializeViewPage,
} from './protocol';
import { mintCsrfToken } from './csrf';
import { decodeFlash } from './flash';

/** What the SSR entry (`entry-server.tsx`) returns for a page. */
export interface ViewRenderResult {
	html: string;
	headTags: string;
}

export type ViewRenderFn = (page: ViewPage) => Promise<ViewRenderResult> | ViewRenderResult;

interface ViewServerEntry {
	render: ViewRenderFn;
}

const HEAD_PLACEHOLDER = '<!--kratos-head-->';
const APP_PLACEHOLDER = '<!--kratos-app-->';
const PAGE_PLACEHOLDER = '<!--kratos-page-->';

/**
 * Renders and serves view pages. Framework-agnostic: it only touches the neutral
 * {@link KratosRequest}/{@link KratosReply}, so it works on every adapter.
 *
 * The React render itself lives in the app's Vite-built SSR bundle (which imports
 * `@maxal_studio/kratosjs-react/server`) — core never imports React. In dev the
 * bundle is loaded through the shared Vite dev server's `ssrLoadModule`; in prod
 * from the built `dist/views/server/entry-server.js`.
 */
export class ViewService {
	readonly mode: 'development' | 'production';

	private readonly panel: Panel;
	private readonly config: ResolvedViewsConfig;
	private readonly appRoot: string;

	// dev
	private devServer?: AdminSpaDevServer;

	// prod (loaded in initProd)
	private prodTemplate?: string;
	private prodServerEntry?: ViewServerEntry;
	private prodVersion: string | null = null;

	constructor(
		panel: Panel,
		config: ResolvedViewsConfig,
		options: { appRoot?: string; mode?: 'development' | 'production' } = {},
	) {
		this.panel = panel;
		this.config = config;
		this.appRoot = options.appRoot ?? process.cwd();
		this.mode = options.mode ?? (process.env.NODE_ENV === 'production' ? 'production' : 'development');
	}

	/** PROD: load the built SSR entry, HTML shell, and asset-manifest version. */
	async initProd(): Promise<void> {
		const clientDir = path.join(this.appRoot, 'dist', 'views', 'client');
		const serverDir = path.join(this.appRoot, 'dist', 'views', 'server');
		const templatePath = path.join(clientDir, this.config.template);

		// Vite names the SSR entry `.mjs` for a CommonJS app (no `"type": "module"`)
		// and `.js` for an ESM app — accept either.
		const serverEntryPath = ['entry-server.mjs', 'entry-server.js']
			.map(name => path.join(serverDir, name))
			.find(fs.existsSync);

		if (!fs.existsSync(templatePath) || !serverEntryPath) {
			throw new Error(
				`[kratosjs] NODE_ENV=production but no views build found at ${path.join(this.appRoot, 'dist', 'views')}.\n` +
					'Run "npm run build:views" in your app to create the production views bundle.',
			);
		}

		this.prodTemplate = fs.readFileSync(templatePath, 'utf-8');

		const mod = await import(pathToFileURL(serverEntryPath).href);
		const render = (mod.render ?? mod.default?.render) as ViewRenderFn | undefined;
		if (typeof render !== 'function') {
			throw new Error('[kratosjs] views entry-server.js must export a `render(page)` function.');
		}
		this.prodServerEntry = { render };

		this.prodVersion = this.computeManifestVersion(clientDir);
	}

	/** DEV: keep the shared Vite dev server so pages can be SSR-loaded with HMR. */
	bindDevServer(devServer: AdminSpaDevServer): void {
		this.devServer = devServer;
	}

	/** Asset version for staleness checks. Config override wins; else prod manifest hash; null in dev. */
	version(): string | null {
		if (this.config.version) {
			return typeof this.config.version === 'function' ? this.config.version() : this.config.version;
		}
		return this.prodVersion;
	}

	/**
	 * The full protocol decision tree for `reply.view(...)`:
	 * merge shared + resolved props (partial-reload aware) → for a client-router
	 * request return the page JSON (with a version-staleness 409 guard) → otherwise
	 * SSR the HTML shell, minting the CSRF cookie on the first load.
	 */
	async handleView(
		req: KratosRequest,
		reply: KratosReply,
		component: string,
		props: Record<string, unknown>,
		options?: ViewReplyOptions,
	): Promise<void> {
		const status = options?.status ?? 200;
		const isView = req.header(VIEW_HEADER) === 'true';

		// Mint the CSRF token up front on full loads so it is available in shared props.
		let csrfToken = req.cookies[CSRF_COOKIE];
		if (!isView && this.config.csrf && !csrfToken) {
			csrfToken = mintCsrfToken();
			reply.cookie(CSRF_COOKIE, csrfToken, { path: '/', sameSite: 'lax' });
		}

		// Partial-reload filtering only applies when the target component matches.
		const only = parseHeaderList(req.header(VIEW_ONLY_HEADER));
		const except = parseHeaderList(req.header(VIEW_EXCEPT_HEADER));
		const requestedComponent = req.header(VIEW_COMPONENT_HEADER);
		const partial =
			isView &&
			(only.length > 0 || except.length > 0) &&
			(!requestedComponent || requestedComponent === component);

		const shared = await this.collectSharedProps(req, csrfToken);
		const resolved = await resolveProps(props, { only, except, partial });
		const mergedProps: Record<string, unknown> = { ...shared, ...resolved };

		// Flash errors (from a prior back()) merge in and the cookie is cleared.
		const flash = decodeFlash(req.cookies[FLASH_COOKIE]);
		if (flash?.errors && typeof flash.errors === 'object') {
			mergedProps.errors = { ...(mergedProps.errors as object), ...(flash.errors as object) };
		}
		if (req.cookies[FLASH_COOKIE]) {
			reply.clearCookie(FLASH_COOKIE, { path: '/' });
		}

		const page: ViewPage = {
			component,
			props: mergedProps,
			url: req.url,
			version: this.version(),
		};

		if (isView) {
			// Asset version drifted since the client loaded → force a hard navigation.
			const clientVersion = req.header(VIEW_VERSION_HEADER);
			if (req.method === 'GET' && page.version && clientVersion && clientVersion !== page.version) {
				reply.status(409).header(VIEW_LOCATION_HEADER, req.url).json({ location: req.url });
				return;
			}
			reply.status(status).header(VIEW_RESPONSE_HEADER, 'true').header('Vary', VIEW_RESPONSE_HEADER).json(page);
			return;
		}

		const html = await this.renderHtml(req, page);
		reply.status(status).html(html);
	}

	async close(): Promise<void> {
		// The Vite dev server is owned and closed by AdminSpaService.
		this.devServer = undefined;
	}

	// ---- internals ----

	private async collectSharedProps(
		req: KratosRequest,
		csrfToken: string | undefined,
	): Promise<Record<string, unknown>> {
		const shared: Record<string, unknown> = {
			auth: { user: req.authUser ?? null },
			locale: this.panel.resolveLocale({
				query: req.query as Record<string, unknown>,
				headers: req.headers,
			}),
		};
		if (this.config.csrf) {
			shared.csrf = csrfToken ?? req.cookies[CSRF_COOKIE] ?? null;
		}
		for (const fn of this.panel.getViewShareFns()) {
			Object.assign(shared, await fn(req));
		}
		return shared;
	}

	private async renderHtml(req: KratosRequest, page: ViewPage): Promise<string> {
		if (this.mode === 'production') {
			if (!this.prodTemplate || !this.prodServerEntry) {
				throw new Error('[kratosjs] ViewService.initProd() was not called before rendering.');
			}
			const { html, headTags } = await this.prodServerEntry.render(page);
			return this.substitute(this.prodTemplate, html, headTags, page);
		}

		if (!this.devServer) {
			throw new Error('[kratosjs] ViewService dev server not bound — call bindDevServer() during start().');
		}
		const rawTemplate = fs.readFileSync(path.join(this.appRoot, this.config.template), 'utf-8');
		const template = await this.devServer.transformIndexHtml(req.url, rawTemplate);
		const mod = await this.devServer.ssrLoadModule('/src/views/entry-server.tsx');
		const render = (mod.render ?? mod.default?.render) as ViewRenderFn;
		const { html, headTags } = await render(page);
		return this.substitute(template, html, headTags, page);
	}

	private substitute(template: string, appHtml: string, headTags: string, page: ViewPage): string {
		const pageScript = `<script type="application/json" id="${VIEW_PAGE_ELEMENT_ID}">${serializeViewPage(page)}</script>`;
		return template
			.replace(HEAD_PLACEHOLDER, headTags)
			.replace(APP_PLACEHOLDER, appHtml)
			.replace(PAGE_PLACEHOLDER, pageScript);
	}

	private computeManifestVersion(clientDir: string): string | null {
		const manifestPath = path.join(clientDir, '.vite', 'manifest.json');
		if (!fs.existsSync(manifestPath)) {
			return null;
		}
		const contents = fs.readFileSync(manifestPath);
		return crypto.createHash('sha256').update(contents).digest('hex').slice(0, 12);
	}
}
