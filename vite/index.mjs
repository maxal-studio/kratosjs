import react from '@vitejs/plugin-react';

/**
 * Vite config factory for KratosJs admin clients.
 *
 * Apps own their admin entry (index.html + src/admin/main.tsx) and use this
 * factory in their vite.config:
 *
 * ```js
 * // vite.config.mjs
 * import { defineConfig } from 'vite';
 * import { kratosAdminVite } from '@maxal_studio/kratosjs/vite';
 *
 * export default defineConfig(kratosAdminVite());
 * ```
 *
 * In development the KratosJs server (vite-express) serves the entry with HMR.
 * For production run `vite build`, which outputs to `dist/admin`; the server
 * then serves the static bundle when NODE_ENV=production.
 *
 * @param {object} [options]
 * @param {string} [options.outDir] Build output directory (default: 'dist/admin')
 * @param {import('vite').UserConfig} [options.vite] Extra Vite config merged on top
 * @returns {import('vite').UserConfig}
 */
export function kratosAdminVite(options = {}) {
	const { outDir = 'dist/admin', vite = {} } = options;

	/** @type {import('vite').UserConfig} */
	const config = {
		base: '/',
		plugins: [
			react({
				include: /\.(tsx?|jsx)$/,
				jsxRuntime: 'automatic',
			}),
			...(vite.plugins ?? []),
		],
		resolve: {
			dedupe: ['react', 'react-dom', 'react-hook-form'],
			...(vite.resolve ?? {}),
		},
		server: {
			allowedHosts: true,
			fs: {
				strict: false,
			},
			...(vite.server ?? {}),
		},
		optimizeDeps: {
			// Pre-bundle the (pure, server-free) validation engine so the dev
			// server can serve its named exports as ESM.
			include: ['react', 'react-dom', 'react-hook-form', '@maxal_studio/kratosjs/dist/validation'],
			...(vite.optimizeDeps ?? {}),
		},
		build: {
			outDir,
			emptyOutDir: true,
			...(vite.build ?? {}),
			commonjsOptions: {
				// The kratosjs core is CommonJS. In a linked/workspace install it
				// resolves OUTSIDE node_modules, so the default CJS transform
				// (node_modules only) would skip it and Rollup couldn't see named
				// exports like `ValidationEngine`. Widen it to the pure validation
				// module — the only core code the browser bundle pulls in.
				include: [/node_modules/, /[\\/]dist[\\/]validation[\\/]/],
				...(vite.build?.commonjsOptions ?? {}),
			},
		},
	};

	return config;
}
