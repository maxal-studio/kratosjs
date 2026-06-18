import type { UserConfig } from 'vite';

export interface KratosAdminViteOptions {
	/** Build output directory (default: 'dist/admin') */
	outDir?: string;
	/** Extra Vite config merged on top of the defaults */
	vite?: UserConfig;
}

/**
 * Vite config factory for KratosJs admin clients.
 * See package docs for usage.
 */
export declare function kratosAdminVite(options?: KratosAdminViteOptions): UserConfig;
