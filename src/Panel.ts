import path from 'path';
import { MikroORM, EntityManager } from '@mikro-orm/core';
import type {
	CorsOptions,
	HttpMethod,
	KratosMiddleware,
	KratosRouteHandler,
	RouteDefinition,
	StaticMount,
} from './http/types';
import { KratosHttpAdapter } from './http/KratosHttpAdapter';
import { AdminSpaService, normalizePanelPath } from './http/adminSpa';
import { buildPanelRouteTable, composeCustomRouteHandler } from './http/pipeline';
import { ResourceClass } from './BaseResource';
import { Resource } from './Resource';
import { ResourceHooks } from './resource/types';
import { AdapterClass, RegisteredResource, PanelMetadata } from './panel/types';
import { DataAdapter } from './adapters/database/DataAdapter';
import { MikroOrmAdapter } from './adapters/database/MikroOrmAdapter';
import { AuthManager } from './auth/AuthManager';
import { AuthProvider } from './auth/AuthProvider';
import { EmailAuthProvider } from './auth/providers/EmailAuthProvider';
import {
	JWTConfig,
	AuthUser,
	UserFieldMap,
	ResolvedUserFieldMap,
	AuthDefaultsContext,
	SerializeUser,
	SerializeUserContext,
	ExtendUser,
	AuthHooks,
	AuthChallengeProvider,
} from './auth/types';
import { defaultSerializeUser } from './auth/serializeUser';
import { verifyPassword as defaultVerifyPassword } from './auth/password';
import { authMiddleware, optionalAuthMiddleware } from './auth/middleware';
import { MediaAdapter } from './adapters/media/MediaAdapter';
import { Page } from './Page';
import { Widget } from './widgets/Widget';
import { getRequestContext } from './RequestContextStorage';
import { SerializedForm } from './formbuilder/types';
import { ValidationEngine } from './validation/ValidationEngine';
import { RuleDefinition } from './validation/types';
import { KratosI18n, createI18n } from './i18n/KratosI18n';
import { registerServerI18n } from './i18n/serverT';
import { resolveRequestLocale, LocaleSources } from './i18n/resolveRequestLocale';
import { coreResources } from './i18n/locales/core';
import type { I18nConfig, I18nResources, NamespaceResources, Direction } from './i18n/types';

/** The i18n config injected into the admin HTML and consumed by the client. */
export interface ClientI18nConfig {
	locales: string[];
	defaultLocale: string;
	fallbackLocale: string | string[];
	directions?: Record<string, Direction>;
	/** Client-facing catalogs (plugin + app namespaces, all locales). Framework `core` is excluded. */
	resources: I18nResources;
}
import { Plugin } from './plugins/Plugin';
import { mergeHooks, mergeMediaHooks } from './utils/panelHelpers';
import { MediaFileInfo } from './utils/mediaHelpers';
import { OrmManager, OrmOptions, DriverKind } from './panel/OrmManager';
import { MediaManager } from './panel/MediaManager';
import {
	PanelHooks,
	MetadataFilterHook,
	SchemaFilterHook,
	PageBlocksFilterHook,
	PageAccessCheckHook,
	DataFilterHook,
	CapabilitiesFilterHook,
	ActionAccessCheckHook,
	MediaAccessCheckHook,
	MediaHooks,
	MediaHookContext,
} from './panel/PanelHooks';
import { buildPanelMetadata, buildPanelBadges } from './panel/metadata';
import { applyGlobalConfiguration } from './panel/applyGlobalConfiguration';
import { Exporter } from './panel/export';

/** Default panel favicon path — served from bundled assets or app `assets/` via `useStatic`. */
export const DEFAULT_PANEL_FAVICON = '/assets/icon.png';

/**
 * Deep-merge i18n resources (`namespace -> locale -> catalog`) from `source` into
 * `target`. Later sources overwrite earlier keys, which is how core → plugins →
 * app precedence is enforced.
 */
function mergeResources(target: I18nResources, source: I18nResources): void {
	for (const [namespace, byLocale] of Object.entries(source)) {
		const ns = (target[namespace] ??= {});
		for (const [locale, catalog] of Object.entries(byLocale)) {
			ns[locale] = { ...(ns[locale] ?? {}), ...catalog };
		}
	}
}

/**
 * Panel - Central orchestrator for KratosJs admin panels
 *
 * Manages multiple resources, auto-generates Express routes,
 * and provides a shared adapter configuration.
 *
 * The implementation is split into focused modules under src/panel/:
 * - OrmManager: MikroORM lifecycle (config, init, migrations, request context)
 * - MediaManager: media adapters and media-field transformations
 * - PanelHooks: permission/filter hooks registered by plugins
 * - metadata.ts: panel metadata + navigation badge building
 * - routes.ts + controllers/: Express router and HTTP request handlers
 *
 * @example
 * ```typescript
 * const panel = Panel.make('admin')
 *     .path('/api/admin')
 *     .orm({ driver: MySqlDriver, dbName: 'app', user: 'root' })
 *     .resources([UserResource, PostResource])
 *     .middleware([authMiddleware]);
 *
 * await panel.start(3000);
 * ```
 */
export class Panel {
	private _id: string;
	private _title?: string;
	private _icon?: string;
	private _favicon?: string;
	private _basePath: string = '/kratosjs/api';
	private _panelPath: string = '/';
	private _adapterClass?: AdapterClass;
	private _defaultSearchableFields: string[] = [];
	private _resources: Map<string, RegisteredResource> = new Map();
	private _pages: Map<string, typeof Page> = new Map();
	private _middleware: KratosMiddleware[] = [];
	private _resourceHooks: Map<ResourceClass, ResourceHooks> = new Map();
	private _mediaHooks: MediaHooks = {};
	private _authManager?: AuthManager;
	private _httpAdapter?: KratosHttpAdapter;
	/** Custom routes registered via registerRoute(), buffered until start() */
	private _customRoutes: Array<{
		method: HttpMethod;
		path: string;
		handlers: KratosRouteHandler[];
		source: 'app' | 'plugin';
	}> = [];
	/** Static mounts registered via useStatic(), buffered until start() */
	private _staticMounts: StaticMount[] = [];
	/** The final route table, built during start() */
	private _routeTable?: RouteDefinition[];
	/** HTTP behavior options passed to the adapter's init() */
	private _httpOptions: { bodyLimit?: string; cors?: CorsOptions } = {};
	/** Whether to serve the admin SPA client (disable for headless / API-only usage) */
	private _serveAdminClient = true;
	private _adminSpa?: AdminSpaService;
	private _plugins: Array<Plugin | (new () => Plugin)> = [];
	private _pluginInstances: Plugin[] = [];
	// Custom component type names registered by plugins (for metadata/introspection).
	// The actual React components are bundled by the app's admin client build.
	private _customBlocks: Set<string> = new Set();
	private _customFields: Set<string> = new Set();
	private _customColumns: Set<string> = new Set();
	private _customWidgets: Set<string> = new Set();
	private _exporters: Map<string, Exporter> = new Map();

	// i18n: config + accumulated catalogs (kept in separate buckets so app-level
	// translations always win over plugin-level ones regardless of timing).
	private _i18nConfig?: Omit<I18nConfig, 'resources'>;
	private _appTranslations: I18nResources = {};
	private _pluginTranslations: I18nResources = {};
	private _registeringPlugins = false;
	private _serverI18n?: KratosI18n;

	private readonly _ormManager = new OrmManager();
	private readonly _mediaManager = new MediaManager();
	private readonly _hooks = new PanelHooks();

	/**
	 * Create a new Panel instance
	 * @param id - Unique identifier for the panel
	 */
	constructor(id: string) {
		this._id = id;
	}

	/**
	 * Static factory method
	 * @param id - Unique identifier for the panel
	 */
	static make(id: string): Panel {
		return new Panel(id);
	}

	// ============================================================================
	// Basic configuration
	// ============================================================================

	/**
	 * Set the panel title (displayed in the header)
	 * @param title - Panel title
	 */
	title(title: string): this {
		this._title = title;
		return this;
	}

	/**
	 * Get the panel title
	 */
	getTitle(): string | undefined {
		return this._title;
	}

	/**
	 * Set the panel icon shown in the admin header and login screen.
	 * Uses a Lucide icon name (same convention as resource icons, e.g. 'LayoutDashboard').
	 * When {@link favicon} is also set, the favicon image takes precedence in the UI.
	 * @param icon - Lucide icon name
	 */
	icon(icon: string): this {
		this._icon = icon;
		return this;
	}

	/**
	 * Get the panel icon (Lucide icon name)
	 */
	getIcon(): string | undefined {
		return this._icon;
	}

	/**
	 * Set the panel favicon
	 * @param favicon - Favicon URL or path (e.g., '/favicon.ico' or '/assets/favicon.svg')
	 */
	favicon(favicon: string): this {
		this._favicon = favicon;
		return this;
	}

	/**
	 * Get the panel favicon
	 */
	getFavicon(): string {
		return this._favicon ?? DEFAULT_PANEL_FAVICON;
	}

	/**
	 * Set the base path for all routes
	 * @param basePath - Base URL path (e.g., '/api/admin')
	 */
	path(basePath: string): this {
		this._basePath = basePath.replace(/\/$/, ''); // Remove trailing slash
		return this;
	}

	/**
	 * Get the panel ID
	 */
	getId(): string {
		return this._id;
	}

	/**
	 * Get the base path
	 */
	getBasePath(): string {
		return this._basePath;
	}

	/**
	 * Set the admin UI mount path (where the panel SPA is served), independent of the
	 * API base path set by `.path()`. Default `/` serves the SPA at the domain root
	 * (whole-domain catch-all). A value like `/admin` scopes the SPA and its assets to
	 * that path, freeing `/` (and everything outside it) for your own routes.
	 *
	 * Note: a non-root path also requires the admin client's Vite `base` to match —
	 * `kratosAdminVite({ base: '/admin/' })` — so production asset URLs are emitted
	 * under the same path.
	 *
	 * @param uiPath - UI mount path, e.g. '/admin'
	 */
	panelPath(uiPath: string): this {
		this._panelPath = normalizePanelPath(uiPath);
		return this;
	}

	/**
	 * Get the admin UI mount path (normalized; '/' means root).
	 */
	getPanelPath(): string {
		return this._panelPath;
	}

	// ============================================================================
	// Internationalization (i18n)
	// ============================================================================

	/**
	 * Configure multilingual support for the panel and plugins.
	 *
	 * Sets the supported locales, the default active locale, and the fallback
	 * locale. Catalogs may be passed here via `resources` or registered separately
	 * with {@link registerTranslations}. The server `t()` resolves keys against the
	 * active request locale ({@link resolveLocale}).
	 *
	 * @example
	 * panel.i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' })
	 *   .registerTranslations('app', { en: enCatalog, sq: sqCatalog });
	 */
	i18n(config: I18nConfig): this {
		const { resources, ...rest } = config;
		this._i18nConfig = { ...this._i18nConfig, ...rest };
		if (resources) {
			for (const [namespace, byLocale] of Object.entries(resources)) {
				this.registerTranslations(namespace, byLocale);
			}
		}
		return this;
	}

	/**
	 * Register translation catalogs under a namespace.
	 *
	 * Called by the app (defaults to the `app` namespace) and by plugins (in their
	 * `register()`, namespaced by plugin name). App-level registrations always win
	 * over plugin-level ones, so a host app can override any plugin string and add
	 * locales a plugin didn't ship.
	 *
	 * @example panel.registerTranslations({ en: { 'users.label': 'Users' }, sq: {...} });
	 * @example panel.registerTranslations('2fa', { en: {...}, sq: {...} });
	 */
	registerTranslations(resources: NamespaceResources): this;
	registerTranslations(namespace: string, resources: NamespaceResources): this;
	registerTranslations(a: string | NamespaceResources, b?: NamespaceResources): this {
		const namespace = typeof a === 'string' ? a : 'app';
		const resources = (typeof a === 'string' ? b : a) ?? {};
		const bucket = this._registeringPlugins ? this._pluginTranslations : this._appTranslations;
		const ns = (bucket[namespace] ??= {});
		for (const [locale, catalog] of Object.entries(resources)) {
			ns[locale] = { ...(ns[locale] ?? {}), ...catalog };
		}
		return this;
	}

	/**
	 * Build the merged server i18n instance (core → plugins → app precedence) and
	 * register it for the global server `t()`. Called once during {@link start}
	 * after all plugins have registered.
	 */
	private buildServerI18n(): void {
		const merged: I18nResources = {};
		mergeResources(merged, { core: coreResources });
		mergeResources(merged, this._pluginTranslations);
		mergeResources(merged, this._appTranslations);

		// Locales: explicit config wins; otherwise discover from registered app/plugin
		// catalogs (core's own translations don't force extra locales on a panel).
		const declared = this._i18nConfig?.locales;
		const discovered = new Set<string>();
		for (const bucket of [this._pluginTranslations, this._appTranslations]) {
			for (const byLocale of Object.values(bucket)) {
				for (const locale of Object.keys(byLocale)) discovered.add(locale);
			}
		}
		const defaultLocale = this._i18nConfig?.defaultLocale ?? 'en';
		const localeSet = new Set<string>(declared ?? (discovered.size ? [...discovered] : ['en']));
		localeSet.add(defaultLocale);
		const locales = [...localeSet];

		this._serverI18n = createI18n({
			locales,
			defaultLocale,
			fallbackLocale: this._i18nConfig?.fallbackLocale ?? defaultLocale,
			directions: this._i18nConfig?.directions,
			resources: merged,
		});
		registerServerI18n(this._serverI18n, defaultLocale);
	}

	/** The merged server i18n instance (available after {@link start}). */
	getServerI18n(): KratosI18n | undefined {
		return this._serverI18n;
	}

	/** The locales this panel supports. */
	getLocales(): string[] {
		return this._serverI18n?.getLocales() ?? this._i18nConfig?.locales ?? ['en'];
	}

	/** The panel's default locale. */
	getDefaultLocale(): string {
		return this._serverI18n?.getDefaultLocale() ?? this._i18nConfig?.defaultLocale ?? 'en';
	}

	/** Resolve the active locale for a request from its query/headers. */
	resolveLocale(sources: LocaleSources): string {
		return resolveRequestLocale(sources, this.getLocales(), this.getDefaultLocale());
	}

	/**
	 * Build the client-facing i18n config injected into the admin HTML.
	 *
	 * The admin client auto-configures its locales, default/fallback locale, and
	 * every app/plugin catalog from this — so translations are authored once on the
	 * server. Only the plugin + app namespaces are exposed (app-wins precedence);
	 * the framework's backend `core` namespace is omitted so it can't clobber the
	 * React package's own bundled `core` chrome.
	 */
	getClientI18nConfig(): ClientI18nConfig {
		const resources: I18nResources = {};
		mergeResources(resources, this._pluginTranslations);
		mergeResources(resources, this._appTranslations);
		const defaultLocale = this.getDefaultLocale();
		return {
			locales: this.getLocales(),
			defaultLocale,
			fallbackLocale: this._i18nConfig?.fallbackLocale ?? defaultLocale,
			...(this._i18nConfig?.directions ? { directions: this._i18nConfig.directions } : {}),
			resources,
		};
	}

	/**
	 * Set default searchable fields for all resources
	 * @param fields - Array of field names
	 */
	searchableFields(fields: string[]): this {
		this._defaultSearchableFields = fields;
		return this;
	}

	/**
	 * Add middleware to all panel routes. Middleware receives framework-neutral
	 * (req, reply, next) and runs on every adapter — respond via `reply` (without
	 * calling next()) to short-circuit, e.g. for rate limiting.
	 * @param middleware - Array of KratosMiddleware functions
	 */
	middleware(middleware: KratosMiddleware[]): this {
		this._middleware = middleware;
		return this;
	}

	/**
	 * Get the panel-level middleware (used when composing routes)
	 */
	getMiddleware(): KratosMiddleware[] {
		return this._middleware;
	}

	// ============================================================================
	// Database / ORM
	// ============================================================================

	/**
	 * Set the database adapter class to use for all resources
	 * Defaults to MikroOrmAdapter if not specified
	 * @param adapterClass - Database adapter class constructor
	 */
	databaseAdapter(adapterClass: AdapterClass): this {
		this._adapterClass = adapterClass;
		return this;
	}

	/**
	 * Get the database adapter class
	 */
	getDatabaseAdapter(): AdapterClass | undefined {
		return this._adapterClass;
	}

	/**
	 * Configure the MikroORM connection for the panel.
	 * Accepts either a MikroORM options object (the panel will call MikroORM.init() during start(),
	 * merging in all entities registered by resources and plugins) or an already-initialized
	 * MikroORM instance.
	 *
	 * @param config - MikroORM options object or MikroORM instance
	 * @param options - Panel-level ORM behavior:
	 *   - migrate: run pending migrations on start (default: true when migrations are configured)
	 *   - updateSchema: sync the database schema on start (useful in development / for MongoDB indexes)
	 *
	 * @example
	 * ```typescript
	 * import { MySqlDriver } from '@mikro-orm/mysql';
	 *
	 * panel.orm({
	 *     driver: MySqlDriver,
	 *     dbName: 'app',
	 *     user: 'root',
	 *     password: '',
	 * });
	 * ```
	 */
	orm(config: Record<string, any> | MikroORM, options?: OrmOptions): this {
		this._ormManager.configure(config, options);
		return this;
	}

	/**
	 * Get the MikroORM instance (available after start())
	 */
	getOrm(): MikroORM {
		return this._ormManager.getOrm();
	}

	/**
	 * Get the context-aware EntityManager (available after start()).
	 * Inside a request this resolves to the request-scoped fork.
	 */
	getEm(): EntityManager {
		return this._ormManager.getEm();
	}

	/**
	 * Get the configured database driver kind ('mongo' or 'sql').
	 * Available as soon as panel.orm() has been called, so plugins can build
	 * driver-specific entities and pick matching migrations during register().
	 */
	getDriverKind(): DriverKind {
		return this._ormManager.getDriverKind();
	}

	/**
	 * Register MikroORM entities with the panel (for plugins).
	 * Entities registered here are merged into the ORM configuration during start(),
	 * so plugins can ship their own models without touching the host app config.
	 *
	 * @param entities - Array of EntitySchema instances or entity classes
	 */
	registerEntities(entities: any[]): this {
		this._ormManager.registerEntities(entities);
		return this;
	}

	/**
	 * Register MikroORM migration classes with the panel (for plugins).
	 * Registered migrations are merged into the ORM's migrationsList and executed
	 * (in registration order) during start(), before any adapter is created.
	 * This allows plugins to create/modify database tables directly.
	 *
	 * @param migrations - Array of Migration classes (from @mikro-orm/migrations)
	 */
	registerMigrations(migrations: Array<new (...args: any[]) => any>): this {
		this._ormManager.registerMigrations(migrations);
		return this;
	}

	/**
	 * Pipeline step that creates a request-scoped MikroORM context (forked EntityManager).
	 * Applied automatically to panel routes and plugin-registered routes.
	 */
	ormContextStep(): KratosMiddleware {
		return this._ormManager.contextStep();
	}

	// ============================================================================
	// HTTP adapter
	// ============================================================================

	/**
	 * Set the HTTP adapter instance to run the server on.
	 * Required — install an adapter package (e.g. @maxal_studio/kratosjs-express)
	 * and pass an instance: `panel.httpAdapter(new ExpressAdapter())`.
	 */
	httpAdapter(adapter: KratosHttpAdapter): this {
		this._httpAdapter = adapter;
		return this;
	}

	/**
	 * Get the HTTP adapter instance
	 */
	getHttpAdapter(): KratosHttpAdapter | undefined {
		return this._httpAdapter;
	}

	/**
	 * Configure HTTP behavior passed to the adapter (JSON body limit, CORS).
	 * Defaults: bodyLimit '50mb' (file uploads travel as base64 JSON),
	 * cors { origin: true, credentials: true }.
	 */
	http(options: { bodyLimit?: string; cors?: CorsOptions }): this {
		this._httpOptions = { ...this._httpOptions, ...options };
		return this;
	}

	/**
	 * Disable (or re-enable) serving the admin SPA client.
	 * Useful for headless / API-only deployments and tests.
	 */
	adminClient(enabled: boolean): this {
		this._serveAdminClient = enabled;
		return this;
	}

	/** Throw a descriptive error when no HTTP adapter was configured. */
	private requireHttpAdapter(): KratosHttpAdapter {
		if (!this._httpAdapter) {
			throw new Error(
				'[kratosjs] No HTTP adapter configured.\n' +
					'Install one:  npm install @maxal_studio/kratosjs-express\n' +
					'Then configure it:\n' +
					"  import { ExpressAdapter } from '@maxal_studio/kratosjs-express';\n" +
					'  panel.httpAdapter(new ExpressAdapter());',
			);
		}
		return this._httpAdapter;
	}

	/**
	 * Serve bundled branding assets when the app has not mounted its own `/assets` directory.
	 */
	private mountDefaultAssetsIfNeeded(): void {
		if (this._staticMounts.some(mount => mount.urlPath === '/assets')) {
			return;
		}

		const assetsDir = path.join(__dirname, '..', 'assets');
		this.useStatic('/assets', assetsDir);
	}

	/**
	 * Get the framework-native server instance (escape hatch).
	 * With the express adapter this is the Express app — use it to register raw
	 * framework routes/middleware that need more than the neutral API.
	 * @example const app = panel.getServer<Express>();
	 */
	getServer<T = unknown>(): T {
		return this.requireHttpAdapter().getNative<T>();
	}

	/**
	 * @deprecated Use {@link getServer} instead.
	 */
	getApp(): any {
		return this.getServer();
	}

	/**
	 * Register a custom route with automatic base path, auth, request context, and
	 * media helpers. Handlers receive framework-neutral KratosRequest/KratosReply and
	 * run unchanged on any HTTP adapter. All but the last handler act as middleware
	 * (they receive `next` as a third argument).
	 *
	 * Routes are buffered and registered during start(), BEFORE the panel's own
	 * routes — a custom route wins over `/:resource/...` patterns.
	 *
	 * @param method - HTTP method (get, post, put, patch, delete)
	 * @param path - Route path (will be prepended with basePath)
	 * @param handlers - Route handler functions
	 */
	registerRoute(
		method: 'get' | 'post' | 'put' | 'patch' | 'delete',
		path: string,
		...handlers: KratosRouteHandler[]
	): this {
		if (handlers.length === 0) {
			throw new Error(`[kratosjs] registerRoute('${method}', '${path}') needs at least one handler`);
		}
		this._customRoutes.push({
			method: method.toUpperCase() as HttpMethod,
			path,
			handlers,
			source: this._registeringPlugins ? 'plugin' : 'app',
		});
		return this;
	}

	/**
	 * Serve static files from a directory. Buffered and mounted during start().
	 * @param path - URL path to serve files from
	 * @param directory - Directory path to serve files from
	 */
	useStatic(path: string, directory: string): this {
		this._staticMounts.push({ urlPath: path, directory });
		return this;
	}

	/**
	 * Get all registered routes (exact — read from the core route table).
	 */
	getRegisteredRoutes(): Array<{ method: string; path: string }> {
		const table = this._routeTable ?? this.getRouteTable();
		return table.map(route => ({ method: route.method, path: route.path }));
	}

	// ============================================================================
	// Custom components
	// ============================================================================

	/**
	 * Register a custom block component type name (e.g., 'live-sessions').
	 * The matching React component is provided by the plugin's client manifest
	 * and bundled by the app's admin client build.
	 */
	registerCustomBlock(name: string): this {
		this._customBlocks.add(name);
		return this;
	}

	/**
	 * Register a custom field component type name (e.g., 'star-rating').
	 */
	registerCustomField(name: string): this {
		this._customFields.add(name);
		return this;
	}

	/**
	 * Register a custom column component type name (e.g., 'star-rating').
	 */
	registerCustomColumn(name: string): this {
		this._customColumns.add(name);
		return this;
	}

	/**
	 * Register a custom widget component type name (e.g., 'card').
	 */
	registerCustomWidget(name: string): this {
		this._customWidgets.add(name);
		return this;
	}

	/**
	 * Register a custom validation rule into the shared validation engine.
	 *
	 * The rule becomes available to both the backend `SchemaValidator` and (when
	 * the plugin also ships it in its client manifest) the React `useValidation`
	 * hook — the same `RuleDefinition` object can be authored once and referenced
	 * from both entries.
	 *
	 * @example
	 * panel.registerValidationRule('phone', {
	 *   validate: ({ value }) => /^\+?[0-9 ]{7,}$/.test(String(value)),
	 *   message: ({ label, field }) => `${label || field} must be a phone number`,
	 * });
	 */
	registerValidationRule(name: string, definition: Omit<RuleDefinition, 'name'>): this {
		ValidationEngine.register({ ...definition, name });
		return this;
	}

	/**
	 * Register an exporter for a given format (e.g. 'csv'), used by the core
	 * `POST /:resource/export` endpoint. Registered by export plugins.
	 */
	registerExporter(format: string, exporter: Exporter): this {
		this._exporters.set(format, exporter);
		return this;
	}

	/**
	 * Get the exporter registered for a format, if any.
	 */
	getExporter(format: string): Exporter | undefined {
		return this._exporters.get(format);
	}

	/**
	 * Get the registered custom component type names.
	 * Used when building panel metadata.
	 */
	getCustomComponents(): {
		blocks: Set<string>;
		fields: Set<string>;
		columns: Set<string>;
		widgets: Set<string>;
	} {
		return {
			blocks: this._customBlocks,
			fields: this._customFields,
			columns: this._customColumns,
			widgets: this._customWidgets,
		};
	}

	// ============================================================================
	// Lifecycle
	// ============================================================================

	/**
	 * Register plugins with the panel.
	 * Plugins are registered during start() after all configuration is complete
	 * but before routes are mounted, giving them access to all panel features.
	 * Accepts plugin classes (instantiated with no arguments) or pre-configured
	 * plugin instances (for plugins that take options).
	 *
	 * @example
	 * ```typescript
	 * panel.plugins([
	 *     LoggingPlugin,                                  // class
	 *     new DashboardPlugin({ widgetResources: [...] }) // configured instance
	 * ]);
	 * ```
	 */
	plugins(plugins: Array<Plugin | (new () => Plugin)>): this {
		this._plugins = plugins;
		return this;
	}

	/**
	 * Start the HTTP server
	 * @param port - Port number to listen on
	 * @param callback - Optional callback function called when server starts
	 */
	async start(port: number, callback?: () => void): Promise<void> {
		const adapter = this.requireHttpAdapter();

		// 1. Register all plugins (after all configuration is complete, before ORM init)
		// Plugins can register resources, entities, migrations, and routes at this point.
		// The flag routes plugin `registerTranslations` calls into the plugin bucket
		// so app-level translations always win over them.
		this._registeringPlugins = true;
		for (const pluginOrClass of this._plugins) {
			const plugin = typeof pluginOrClass === 'function' ? new pluginOrClass() : pluginOrClass;
			try {
				this._pluginInstances.push(plugin);
				const result = plugin.register(this);
				// Handle async registration
				if (result instanceof Promise) {
					await result;
				}
			} catch (error) {
				console.error(`Error registering plugin ${plugin.getName?.() ?? 'unknown'}:`, error);
			}
		}
		this._registeringPlugins = false;

		// Build the merged server i18n instance (core → plugins → app) now that all
		// plugin catalogs are registered, and wire it to the global server `t()`.
		this.buildServerI18n();

		// 2. Initialize the ORM with all entities (resources + plugins), run migrations,
		// create adapters, and run plugin boot hooks (seeding)
		await this.initializeOrm();

		// 3. Drive the HTTP adapter: init → static mounts → routes → admin SPA → listen.
		// The route table is built now, after all configuration (including plugins).
		this.mountDefaultAssetsIfNeeded();
		this._routeTable = this.getRouteTable();

		await adapter.init({
			panel: this,
			basePath: this._basePath,
			panelPath: this._panelPath,
			bodyLimit: this._httpOptions.bodyLimit ?? '50mb',
			cors: this._httpOptions.cors ?? { origin: true, credentials: true },
		});

		for (const mount of this._staticMounts) {
			adapter.useStatic(mount);
		}
		for (const route of this._routeTable) {
			adapter.registerRoute(route);
		}

		if (this._serveAdminClient) {
			this._adminSpa = new AdminSpaService(this);
			await adapter.serveAdminSpa(this._adminSpa);
		}

		await adapter.listen(port, callback);
	}

	/**
	 * Stop the HTTP server (and the Vite dev server in development).
	 */
	async stop(): Promise<void> {
		await this._adminSpa?.close();
		await this._httpAdapter?.close();
	}

	/**
	 * Initialize the ORM (entities, migrations, schema sync), then create a
	 * database adapter per registered resource and run plugin boot() hooks.
	 */
	private async initializeOrm(): Promise<void> {
		// Collect entities from all registered resources
		const resourceEntities: any[] = [];
		for (const [, registered] of this._resources) {
			if (registered.resourceClass.entity) {
				resourceEntities.push(registered.resourceClass.entity);
			}
		}

		await this._ormManager.initialize(resourceEntities);

		// Create database adapters for all registered resources
		for (const [, registered] of this._resources) {
			if (!registered.adapter) {
				registered.adapter = this.createAdapter(registered.resourceClass);
			}
		}

		// Run plugin boot hooks (e.g. seeding) with a forked EntityManager
		for (const plugin of this._pluginInstances) {
			if (typeof plugin.boot === 'function') {
				try {
					await plugin.boot(this._ormManager.getEm().fork(), this);
				} catch (error) {
					console.error(`Error booting plugin ${plugin.getName()}:`, error);
				}
			}
		}
	}

	/**
	 * Create a database adapter for a resource class
	 */
	private createAdapter(ResourceClass: ResourceClass): DataAdapter {
		const AdapterCls = this._adapterClass || MikroOrmAdapter;

		// Get searchable fields (resource-specific or default)
		const searchableFields =
			ResourceClass.getSearchableFields().length > 0
				? ResourceClass.getSearchableFields()
				: this._defaultSearchableFields;

		return new AdapterCls(this._ormManager.getOrm(), ResourceClass.entity, searchableFields);
	}

	// ============================================================================
	// Media
	// ============================================================================

	/**
	 * Get the media manager (adapter registry + media-field transformations)
	 */
	get media(): MediaManager {
		return this._mediaManager;
	}

	/**
	 * Set the media adapters for file uploads
	 * @param adapters - Array of MediaAdapter instances
	 */
	mediaAdapters(adapters: MediaAdapter[]): this {
		const staticMounts = this._mediaManager.register(adapters);
		// LocalMediaAdapters need their upload directories served statically
		for (const mount of staticMounts) {
			this.useStatic(mount.path, mount.directory);
		}
		return this;
	}

	/**
	 * Get the media adapter by name, or return the default adapter
	 * @param name - Optional adapter name
	 */
	getMediaAdapter(name?: string): MediaAdapter | undefined {
		return this._mediaManager.getAdapter(name);
	}

	/**
	 * Get the default adapter name
	 */
	getDefaultAdapterName(): string | undefined {
		return this._mediaManager.getDefaultAdapterName();
	}

	/**
	 * Resolve media URL from media value (string, object with url, or object with key/bucket)
	 * @param mediaValue - Media value to resolve
	 * @returns Resolved URL or undefined
	 */
	async resolveMediaUrl(mediaValue: any): Promise<string | undefined> {
		return this._mediaManager.resolveUrl(mediaValue);
	}

	/**
	 * Format a single media key for database bucket
	 * Simple helper that takes a key string and returns { key, bucket } format
	 * @param key - The media key (e.g., "uploads-test/test/file.png")
	 * @param bucketName - Optional bucket adapter name (defaults to default adapter)
	 * @returns Formatted media object: { key, bucket }
	 */
	async formatMediaKey(key: string, bucketName?: string): Promise<{ key: string; bucket: string }> {
		return this._mediaManager.formatKey(key, bucketName);
	}

	/**
	 * Transform media fields for bucket (create operation)
	 * Public method that can be bound and passed to controllers
	 */
	async transformMediaFieldsForStorage(data: Record<string, any>, formSchema: SerializedForm): Promise<void> {
		return this._mediaManager.transformFieldsForStorage(data, formSchema);
	}

	// Note: v1's attachMediaHelpers() middleware is gone — media helpers are built
	// into every KratosRequest (see buildKratosRequest), and redirectTo is a
	// standard KratosReply method.

	// ============================================================================
	// Authentication
	// ============================================================================

	/**
	 * Configure authentication for the panel
	 * @param config - Authentication configuration with JWT settings and providers
	 */
	auth(config: {
		jwt: JWTConfig;
		/**
		 * Auth providers. Optional: when omitted and `userEntity` is set, a default
		 * EmailAuthProvider (email/password) is added automatically.
		 */
		providers?: AuthProvider[];
		/**
		 * Look up a user by id for token refresh and `/me`. Optional: when omitted and
		 * `userEntity` is set, a default implementation is used.
		 */
		getUserById?: (id: string) => Promise<AuthUser | null>;
		/**
		 * The user entity the default credential/user lookups query. Enables the
		 * default EmailAuthProvider and the default `getUserById`.
		 */
		userEntity?: unknown;
		/** Map the conventional user fields to your entity's property names. */
		userFields?: UserFieldMap;
		/**
		 * Fully replace how the raw user entity becomes the client-facing user, for every
		 * provider and every endpoint (login, OAuth, `/me`, `/refresh`). Rarely needed —
		 * prefer `extendUser` to just add fields. Optional: defaults to
		 * {@link defaultSerializeUser} (id/email/name/avatarUrl, plus role when present).
		 */
		serializeUser?: SerializeUser;
		/**
		 * Additively expose extra fields on the user without rewriting the whole mapping.
		 * The returned object is merged **over** the base serialized user (and can override
		 * its keys). Applies to every provider and endpoint, and is carried in the access
		 * token — keep it identity-sized and non-secret.
		 */
		extendUser?: ExtendUser;
		/** Verify a plaintext password against a stored hash. Defaults to bcrypt. */
		verifyPassword?: (plain: string, hash: string | undefined | null) => Promise<boolean>;
	}): this {
		this._authManager = new AuthManager(config.jwt);

		const fields = this._resolveUserFields(config.userFields);
		const verifyPassword = config.verifyPassword ?? defaultVerifyPassword;
		const serializeCtx: SerializeUserContext = {
			fields,
			resolveMediaUrl: (value: any) => this.resolveMediaUrl(value),
			getEm: () => this.getEm(),
		};
		// Compose the effective serializer once: base (custom or default), then merge any
		// `extendUser` additions over it. Used by every path (login, OAuth, /me, refresh).
		const serializeUser = this._composeSerializeUser(config.serializeUser, config.extendUser);

		// Default to an email/password provider when none supplied and we have an entity.
		const providers = config.providers ?? (config.userEntity ? [new EmailAuthProvider()] : []);

		const ctx: AuthDefaultsContext = {
			userEntity: config.userEntity,
			fields,
			getEm: () => this.getEm(),
			getDriverKind: () => this.getDriverKind(),
			verifyPassword,
		};

		for (const provider of providers) {
			// Let providers install panel-bound defaults (e.g. default validateCredentials).
			provider.bindPanelDefaults?.(ctx);
			this._authManager.registerProvider(provider);
		}

		// getUserById (explicit, or a default backed by the user entity) for refresh / me.
		const getUserById =
			config.getUserById ??
			(config.userEntity ? this._defaultGetUserById(config.userEntity, serializeUser, serializeCtx) : undefined);

		this._authManager.setUserShaping({ serializeUser, serializeCtx, getUserById });

		return this;
	}

	/** Apply field-name defaults (email/password/firstname/lastname/profileMediaImage/role). */
	private _resolveUserFields(fields?: UserFieldMap): ResolvedUserFieldMap {
		return {
			email: fields?.email ?? 'email',
			password: fields?.password ?? 'password',
			firstname: fields?.firstname ?? 'firstname',
			lastname: fields?.lastname ?? 'lastname',
			image: fields?.image ?? 'profileMediaImage',
			role: fields?.role ?? 'role',
		};
	}

	/**
	 * Compose the effective user serializer: a base (a custom `serializeUser` or the
	 * default), with any `extendUser` additions merged over it. The result is the single
	 * mapping used across every provider and endpoint.
	 */
	private _composeSerializeUser(serializeUser?: SerializeUser, extendUser?: ExtendUser): SerializeUser {
		const base = serializeUser ?? defaultSerializeUser;
		if (!extendUser) {
			return base;
		}
		return async (user, ctx) => ({ ...(await base(user, ctx)), ...(await extendUser(user, ctx)) });
	}

	/**
	 * Build the default `getUserById`: look the user up by primary key (driver-aware),
	 * then shape it with the same `serializeUser` used by the login flow — so `/me` and
	 * `/refresh` expose exactly the fields an app configured, with no separate mapping.
	 */
	private _defaultGetUserById(
		userEntity: unknown,
		serializeUser: SerializeUser,
		serializeCtx: SerializeUserContext,
	): (id: string) => Promise<AuthUser | null> {
		return async (id: string): Promise<AuthUser | null> => {
			const em = this.getEm();
			const where = this.getDriverKind() === 'mongo' ? { id } : { id: Number(id) };
			const user: any = await em.findOne(userEntity as any, where);
			if (!user) {
				return null;
			}
			return serializeUser(user, serializeCtx);
		};
	}

	/**
	 * Get the authentication pipeline step for protecting custom routes
	 * @returns KratosMiddleware that requires authentication
	 */
	getAuthMiddleware(): KratosMiddleware {
		if (!this._authManager) {
			throw new Error('Authentication not configured. Call panel.auth() first.');
		}
		return authMiddleware(this._authManager);
	}

	/**
	 * Get the optional authentication pipeline step
	 * Attaches the user to the request if the token is valid, but doesn't block if not
	 */
	getOptionalAuthMiddleware(): KratosMiddleware {
		if (!this._authManager) {
			throw new Error('Authentication not configured. Call panel.auth() first.');
		}
		return optionalAuthMiddleware(this._authManager);
	}

	/**
	 * Get the AuthManager instance
	 */
	getAuthManager(): AuthManager | undefined {
		return this._authManager;
	}

	/**
	 * Register lifecycle hooks around the login flow (low-level extension point).
	 * Hooks run for every provider, in registration order. Use this for cross-cutting
	 * concerns like rate-limiting, audit logging, or captcha.
	 *
	 * Must be called after `panel.auth(...)`.
	 */
	registerAuthHook(hooks: AuthHooks): this {
		if (!this._authManager) {
			throw new Error('Call panel.auth(...) before registering auth hooks.');
		}
		this._authManager.registerHook(hooks);
		return this;
	}

	/**
	 * Register a challenge provider (high-level "interrupt the login with a verification
	 * step" extension point, e.g. a one-time-code verification). Built on top of the auth
	 * hook + challenge engine.
	 *
	 * Must be called after `panel.auth(...)`.
	 */
	registerAuthChallenge(challenge: AuthChallengeProvider): this {
		if (!this._authManager) {
			throw new Error('Call panel.auth(...) before registering auth challenges.');
		}
		this._authManager.registerChallenge(challenge);
		return this;
	}

	/**
	 * @deprecated Auth is applied to custom routes automatically; for manual use,
	 * prefer {@link getAuthMiddleware}.
	 */
	attachAuth(): KratosMiddleware {
		return this.getAuthMiddleware();
	}

	// ============================================================================
	// Resources & pages
	// ============================================================================

	/**
	 * Register resource classes with the panel
	 * @param resourceClasses - Array of resource classes extending BaseResource
	 */
	resources(resourceClasses: ResourceClass[]): this {
		for (const ResourceClass of resourceClasses) {
			this._registerResource(ResourceClass);
		}
		return this;
	}

	/**
	 * Register page classes with the panel
	 * @param pageClasses - Array of page classes extending Page
	 */
	pages(pageClasses: Array<typeof Page>): this {
		for (const PageClass of pageClasses) {
			this._registerPage(PageClass);
		}
		return this;
	}

	/**
	 * Register a single resource class (for plugins)
	 * This is a public method that plugins can use to register resources
	 * without overriding existing ones
	 * @param ResourceClass - Resource class extending BaseResource
	 */
	registerResource(ResourceClass: ResourceClass): this {
		this._registerResource(ResourceClass);
		return this;
	}

	/**
	 * Register a single page class (for plugins)
	 * @param PageClass - Page class extending Page
	 */
	registerPage(PageClass: typeof Page): this {
		this._registerPage(PageClass);
		return this;
	}

	/**
	 * Register a single page class (internal)
	 */
	private _registerPage(PageClass: typeof Page): void {
		const slug = PageClass.slug;

		if (!slug) {
			throw new Error(`Page ${PageClass.name} must have a static 'slug' property`);
		}

		if (this._pages.has(slug)) {
			throw new Error(`Page with slug "${slug}" is already registered`);
		}

		this._pages.set(slug, PageClass);
	}

	/**
	 * Register a single resource class (internal)
	 */
	private _registerResource(ResourceClass: ResourceClass): void {
		const slug = ResourceClass.getSlug();

		if (!slug) {
			throw new Error(`Resource ${ResourceClass.name} must have a static 'slug' property`);
		}

		if (!ResourceClass.entity) {
			throw new Error(`Resource ${ResourceClass.name} must have a static 'entity' property`);
		}

		// Set panel reference on resource class
		ResourceClass.setPanel(this);

		// Create the adapter immediately when the ORM is already initialized,
		// otherwise it is created during start() after MikroORM.init()
		const adapter = this._ormManager.isInitialized()
			? this.createAdapter(ResourceClass)
			: (undefined as unknown as DataAdapter);

		// Get action handlers
		const actions = ResourceClass.actions();

		// Get hooks from all sources
		const staticHooks = ResourceClass.hooks?.() || {};
		const registeredHooks = this._resourceHooks.get(ResourceClass) || {};
		const mergedHooks = mergeHooks(staticHooks, registeredHooks);

		// Register the resource. Widgets are NOT built here: like form()/table(),
		// `widgets()` must run per request (inside the request context) so any t()
		// calls in widget labels resolve against the active locale — see
		// {@link buildResourceWidgets}.
		this._resources.set(slug, {
			resourceClass: ResourceClass,
			adapter,
			actions,
			hooks: mergedHooks,
		});
	}

	/**
	 * Build a fresh `name -> Widget` map for a resource by calling its `widgets()`
	 * per request. Running this inside the request context (controllers are) means
	 * widget labels authored with `t(...)` resolve to the active locale, mirroring
	 * how form/table schemas are rebuilt per request.
	 */
	buildResourceWidgets(registered: RegisteredResource): Map<string, Widget> {
		const map = new Map<string, Widget>();
		const instances = registered.resourceClass.widgets?.() || [];
		for (const widget of instances) {
			map.set(widget.getName(), widget);
		}
		return map;
	}

	/**
	 * Register hooks for a resource class (for plugins)
	 * Can be called before or after resource registration
	 * Hooks are merged with existing hooks (arrays are concatenated)
	 *
	 * @param ResourceClass - The resource class to register hooks for
	 * @param hooks - Hook handlers to register
	 */
	registerResourceHooks(ResourceClass: ResourceClass, hooks: ResourceHooks): this {
		const existing = this._resourceHooks.get(ResourceClass) || {};
		const merged = mergeHooks(existing, hooks);
		this._resourceHooks.set(ResourceClass, merged);

		// If resource is already registered, update its hooks
		const slug = ResourceClass.getSlug();
		const registered = this._resources.get(slug);
		if (registered) {
			registered.hooks = mergeHooks(registered.hooks || {}, merged);
		}

		return this;
	}

	/**
	 * Get a registered resource by slug
	 * @param slug - Resource slug
	 */
	getResource(slug: string): RegisteredResource | undefined {
		return this._resources.get(slug);
	}

	/**
	 * Get all registered resources
	 */
	getResources(): Map<string, RegisteredResource> {
		return this._resources;
	}

	/**
	 * Get all registered pages
	 */
	getPages(): Map<string, typeof Page> {
		return this._pages;
	}

	/**
	 * Create a Resource instance for a registered resource.
	 * Context is taken from request-scoped storage (set by Panel middleware), so it is
	 * available in form(), table(), and everywhere via BaseResource.getContext().
	 * Used by the panel's HTTP controllers.
	 * @param registered - The registered resource
	 */
	createResourceInstance(registered: RegisteredResource): Resource {
		// attach adapter to the request context
		const requestContext = getRequestContext();
		if (requestContext) {
			requestContext.databaseAdapter = registered.adapter;
		}
		// Build the resource's form/table builders, then weave in any plugin-registered
		// global configuration (configureUsing) before serializing to JSON.
		const formBuilder = registered.resourceClass.form();
		const tableBuilder = registered.resourceClass.table();
		applyGlobalConfiguration(formBuilder, tableBuilder);

		return new Resource({
			adapter: registered.adapter,
			formSchema: formBuilder.toJSON(),
			tableSchema: tableBuilder.toJSON(),
			hooks: registered.hooks,
			resourceClass: registered.resourceClass,
		});
	}

	// ============================================================================
	// Permission/filter hooks (registered by plugins)
	// ============================================================================

	/**
	 * Get the hook registry (read by the panel's controllers)
	 */
	get hooks(): PanelHooks {
		return this._hooks;
	}

	/**
	 * Register a hook to filter panel metadata (resources and pages)
	 * Used by plugins to filter metadata based on permissions
	 */
	registerMetadataFilterHook(hook: MetadataFilterHook): this {
		this._hooks.metadataFilter = hook;
		return this;
	}

	/**
	 * Register a hook to filter form schema
	 * Used by plugins to filter form fields based on permissions
	 */
	registerFormSchemaFilterHook(hook: SchemaFilterHook): this {
		this._hooks.formSchemaFilter = hook;
		return this;
	}

	/**
	 * Register a hook to filter table schema
	 * Used by plugins to filter table columns, actions, and widgets based on permissions
	 */
	registerTableSchemaFilterHook(hook: SchemaFilterHook): this {
		this._hooks.tableSchemaFilter = hook;
		return this;
	}

	/**
	 * Register a hook to filter page blocks
	 * Used by plugins to filter page blocks based on permissions
	 */
	registerPageBlocksFilterHook(hook: PageBlocksFilterHook): this {
		this._hooks.pageBlocksFilter = hook;
		return this;
	}

	/**
	 * Register a hook to check page access
	 * Used by plugins to check if user has access to pages
	 */
	registerPageAccessCheckHook(hook: PageAccessCheckHook): this {
		this._hooks.pageAccessCheck = hook;
		return this;
	}

	/**
	 * Register a hook to filter data records based on permissions
	 * This hook is called after data is fetched but before it's returned to the client
	 * @param hook - Function that receives records array, resource slug, operation, and user, returns filtered records
	 */
	registerDataFilterHook(hook: DataFilterHook): this {
		this._hooks.dataFilter = hook;
		return this;
	}

	/**
	 * Register a hook to filter resource capabilities (canCreate, canEdit, canDelete, canView)
	 * This hook is called when returning schema responses to allow plugins to override capabilities
	 * @param hook - Function that receives capabilities object, resource slug, and user, returns filtered capabilities
	 */
	registerCapabilitiesFilterHook(hook: CapabilitiesFilterHook): this {
		this._hooks.capabilitiesFilter = hook;
		return this;
	}

	/**
	 * Register a hook to authorize execution of custom/bulk/header actions and exports.
	 * Called by the action and export controllers before running an action; returning
	 * false yields a 403. Lets plugins gate execution (not just hide buttons).
	 * @param hook - Function that receives the action name, resource slug, and user, returns whether it is allowed
	 */
	registerActionAccessCheckHook(hook: ActionAccessCheckHook): this {
		this._hooks.actionAccessCheck = hook;
		return this;
	}

	/**
	 * Register a hook to authorize media uploads (and validate what is uploaded).
	 * Called by the media controller before storing a file; returning false yields a 403.
	 * Receives a MediaHookContext (user, resourceSlug, fieldName, recordId, filename, etc.).
	 * For the global (non-resource) media routes this is the only gate beyond authentication.
	 * @param hook - Function that returns whether the upload is allowed
	 */
	registerMediaUploadAccessCheckHook(hook: MediaAccessCheckHook): this {
		this._hooks.mediaUploadAccessCheck = hook;
		return this;
	}

	/**
	 * Register a hook to authorize media deletions.
	 * Called by the media controller before deleting a file; returning false yields a 403.
	 * This is the guard against arbitrary-key deletion: a media-manager plugin can verify
	 * the key is owned by the requesting user before allowing it.
	 * @param hook - Function that returns whether the deletion is allowed
	 */
	registerMediaDeleteAccessCheckHook(hook: MediaAccessCheckHook): this {
		this._hooks.mediaDeleteAccessCheck = hook;
		return this;
	}

	/**
	 * Register array-based media lifecycle hooks (the media analog of
	 * registerResourceHooks). Handlers stack — arrays are concatenated — and run
	 * in registration order so each sees the prior handler's mutations.
	 *
	 * `beforeMediaUpload` hooks may mutate the context (e.g. replace `ctx.file`
	 * with a compressed buffer, rename, reroute the bucket); `after*` hooks
	 * observe `ctx.result`. Use this for transforms, linking, logging and audit.
	 * Authorization is separate — see registerMediaUploadAccessCheckHook.
	 * @param hooks - Media hook handlers keyed by lifecycle event
	 */
	registerMediaHooks(hooks: MediaHooks): this {
		this._mediaHooks = mergeMediaHooks(this._mediaHooks, hooks);
		return this;
	}

	/**
	 * Run the registered handlers for a media lifecycle event in order, awaiting
	 * each so a handler sees the previous handler's mutations to the context.
	 * Called by the media controller. Errors propagate to the caller.
	 */
	async executeMediaHooks(event: keyof MediaHooks, ctx: MediaHookContext): Promise<void> {
		const handlers = this._mediaHooks[event];
		if (!handlers?.length) return;

		for (const handler of handlers) {
			await handler(ctx);
		}
	}

	/**
	 * Delete media files while firing the media lifecycle hooks for each one.
	 *
	 * Used by the CRUD controller when a record update removes/replaces a file or a
	 * record is deleted — so `beforeMediaDelete`/`afterMediaDelete` (and `onMediaError`)
	 * fire for backend-initiated deletions just like for the direct delete route.
	 *
	 * Unlike the HTTP delete route, this does NOT run `mediaDeleteAccessCheck`: the
	 * deletion is a side effect of an already-authorized record update/delete, so the
	 * authorization decision was made at the record level. Deletion is best-effort per
	 * file (a failure is reported to `onMediaError` and logged, then skipped).
	 *
	 * `baseContext` carries the trusted server-side context (user, resourceSlug).
	 */
	async deleteMediaFiles(files: MediaFileInfo[], baseContext: Partial<MediaHookContext> = {}): Promise<void> {
		for (const file of files) {
			const ctx: MediaHookContext = { ...baseContext, operation: 'delete', key: file.key, bucket: file.bucket };
			try {
				await this.executeMediaHooks('beforeMediaDelete', ctx);
				await this._mediaManager.deleteFiles([file]);
				await this.executeMediaHooks('afterMediaDelete', ctx);
			} catch (error) {
				ctx.error = error instanceof Error ? error : new Error(String(error));
				try {
					await this.executeMediaHooks('onMediaError', ctx);
				} catch (hookError) {
					console.error('Error in onMediaError hook:', hookError);
				}
				console.warn(`Failed to delete media ${file.key}:`, error);
			}
		}
	}

	// ============================================================================
	// Metadata & routes
	// ============================================================================

	/**
	 * Get panel metadata for frontend consumption
	 * Hidden resources (with static hidden = true) are excluded from navigation
	 * Can be filtered by registered metadata filter hook
	 */
	getMetadata(user?: AuthUser): PanelMetadata | Promise<PanelMetadata> {
		return buildPanelMetadata(this, user);
	}

	/**
	 * Get navigation badge values for all resources and pages (same visibility as getMetadata).
	 * Used by GET /meta/badges for initial load and refresh.
	 */
	async getBadges(user?: AuthUser): Promise<{
		resources: Record<string, { value: string | number | null; color?: string } | null>;
		pages: Record<string, { value: string | number | null; color?: string } | null>;
	}> {
		return buildPanelBadges(this, user);
	}

	/**
	 * Build the complete declarative route table: custom routes first (they win
	 * over `/:resource/...` patterns, matching v1 precedence), then all panel routes.
	 * Every handler is fully composed — adapters register these one-to-one.
	 */
	getRouteTable(): RouteDefinition[] {
		const customRoutes: RouteDefinition[] = this._customRoutes.map(route => ({
			method: route.method,
			path: `${this._basePath}${route.path}`,
			handler: composeCustomRouteHandler(this, route.handlers),
			source: route.source,
		}));

		return [...customRoutes, ...buildPanelRouteTable(this)];
	}
}
