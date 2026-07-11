import type { UserConfig } from 'vite';

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
	/** Extra Vite config merged on top of the defaults */
	vite?: UserConfig;
}

/**
 * Vite config factory for KratosJs admin clients.
 * See package docs for usage.
 */
export declare function kratosAdminVite(options?: KratosAdminViteOptions): UserConfig;
