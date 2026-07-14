import type { Plugin, UserConfig, UserConfigFn } from 'vite';

export interface KratosClientPluginOptions {
	/** Explicit plugin client specifiers to include (merged with auto-discovery). */
	clientEntries?: string[];
	/** Scan the app's dependencies for a `kratosjs.client` package.json field (default true). */
	autoDiscover?: boolean;
}

export interface KratosAdminViteOptions {
	/** Build output directory (default: 'dist/admin') */
	outDir?: string;
	/**
	 * Public base path. Default `'./'` (relative). You normally do NOT set this — the
	 * admin UI path is driven from the backend `panel.panelPath()`, and the KratosJs
	 * server sets the dev base and rewrites the built asset URLs to match. Override only
	 * for advanced/standalone-hosting scenarios.
	 */
	base?: string;
	/** Options forwarded to the `virtual:kratos-client` plugin. */
	client?: KratosClientPluginOptions;
	/** Extra Vite config merged on top of the defaults */
	vite?: UserConfig;
}

export interface KratosViewsViteOptions {
	/** HTML shell entry (default 'views.html') */
	template?: string;
	/** SSR entry module (default 'src/views/entry-server.tsx') */
	ssrEntry?: string;
	/** Client build output directory (default 'dist/views/client') */
	clientOutDir?: string;
	/** SSR build output directory (default 'dist/views/server') */
	serverOutDir?: string;
	/** Public base for built view assets (default '/views/') */
	base?: string;
	/** Options forwarded to the `virtual:kratos-client` plugin. */
	client?: KratosClientPluginOptions;
	/** Extra Vite config merged on top of the defaults */
	vite?: UserConfig;
}

/**
 * Vite config factory for KratosJs admin clients.
 * See package docs for usage.
 */
export declare function kratosAdminVite(options?: KratosAdminViteOptions): UserConfig;

/**
 * Vite config factory for the KratosJs Views SSR layer. Returns a config function
 * (client build + SSR build selected by `isSsrBuild`).
 */
export declare function kratosViewsVite(options?: KratosViewsViteOptions): UserConfigFn;

/** Vite plugin exposing the `virtual:kratos-client` module. */
export declare function kratosClientPlugin(options?: KratosClientPluginOptions): Plugin;
