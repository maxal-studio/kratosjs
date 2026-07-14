import react from '@vitejs/plugin-react';
import { kratosClientPlugin } from './kratosClient.mjs';

/**
 * Default chunking: pull third-party dependencies out of the app bundle into
 * cacheable vendor chunks. React (and friends) rarely change, so isolating
 * them means an app code change doesn't bust the framework/React bundle.
 *
 * @param {string} id Absolute module id being bundled
 * @returns {string | undefined} Chunk name, or undefined to use Rollup's default
 */
function splitVendorChunks(id) {
	const p = id.replace(/\\/g, '/');
	// The kratosjs framework (resolved either via node_modules or a linked
	// workspace path) is the bulk of the bundle and changes on its own cadence —
	// give it a dedicated chunk separate from third-party libs.
	if (p.includes('@maxal_studio/kratosjs')) return 'kratos';
	if (!p.includes('/node_modules/')) return undefined;
	if (/\/node_modules\/(react|react-dom|scheduler|react-hook-form)\//.test(p)) {
		return 'react-vendor';
	}
	return 'vendor';
}

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
 * @param {string} [options.base] Public base path. Default `'./'` (relative) — the admin
 *   UI path is driven entirely from the backend `panel.panelPath()`: the KratosJs server
 *   sets the dev base and rewrites the built index.html's asset URLs to match, so you
 *   normally do NOT set this. A relative base keeps JS chunks and CSS assets
 *   panel-path-independent. Only override for advanced/standalone-hosting scenarios.
 * @param {import('vite').UserConfig} [options.vite] Extra Vite config merged on top
 * @returns {import('vite').UserConfig}
 */
export function kratosAdminVite(options = {}) {
	const { outDir = 'dist/admin', base = './', vite = {} } = options;

	/** @type {import('vite').UserConfig} */
	const config = {
		// Relative base by default so the server can drive the runtime base from panelPath.
		// Explicit option wins; a `vite.base` override still takes final precedence below.
		base: vite.base ?? base,
		plugins: [
			react({
				include: /\.(tsx?|jsx)$/,
				jsxRuntime: 'automatic',
			}),
			// Exposes `virtual:kratos-client` so main.tsx can auto-import plugin manifests.
			kratosClientPlugin(options.client ?? {}),
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
			include: [
				'react',
				'react-dom',
				'react-hook-form',
				'@maxal_studio/kratosjs/dist/validation',
				'@maxal_studio/kratosjs/dist/i18n',
			],
			...(vite.optimizeDeps ?? {}),
		},
		build: {
			outDir,
			emptyOutDir: true,
			// The admin panel is a single-page app that bundles the whole
			// kratosjs-react UI, so the main chunk is legitimately large. Raise
			// the warning threshold to match (apps can override via options.vite.build).
			chunkSizeWarningLimit: 2000,
			...(vite.build ?? {}),
			commonjsOptions: {
				// The kratosjs core is CommonJS. In a linked/workspace install it
				// resolves OUTSIDE node_modules, so the default CJS transform
				// (node_modules only) would skip it and Rollup couldn't see named
				// exports like `ValidationEngine` / `createI18n`. Widen it to the pure
				// validation + i18n modules — the core code the browser bundle pulls in.
				include: [/node_modules/, /[\\/]dist[\\/]validation[\\/]/, /[\\/]dist[\\/]i18n[\\/]/],
				...(vite.build?.commonjsOptions ?? {}),
			},
			rollupOptions: {
				...(vite.build?.rollupOptions ?? {}),
				output: {
					// Split third-party deps into cacheable vendor chunks. An app
					// override (options.vite.build.rollupOptions.output) wins.
					manualChunks: splitVendorChunks,
					...(vite.build?.rollupOptions?.output ?? {}),
				},
			},
		},
	};

	return config;
}

/**
 * Vite config factory for KratosJs Views (SSR public-site layer).
 *
 * Returns a config FUNCTION (not an object) because Views is built twice from one
 * config file — a client build (browser bundle + HTML shell + manifest) and an SSR
 * build (`entry-server.js`). Vite passes `isSsrBuild`, and this picks the matching
 * output:
 *
 * ```js
 * // vite.views.config.mts
 * import { defineConfig } from 'vite';
 * import { kratosViewsVite } from '@maxal_studio/kratosjs/vite';
 * export default defineConfig(kratosViewsVite());
 *
 * // package.json
 * "build:views": "vite build -c vite.views.config.mts && vite build -c vite.views.config.mts --ssr"
 * ```
 *
 * @param {object} [options]
 * @param {string} [options.template] HTML shell entry (default 'views.html')
 * @param {string} [options.ssrEntry] SSR entry module (default 'src/views/entry-server.tsx')
 * @param {string} [options.clientOutDir] Client build output (default 'dist/views/client')
 * @param {string} [options.serverOutDir] SSR build output (default 'dist/views/server')
 * @param {string} [options.base] Public base for built assets (default '/views/')
 * @param {object} [options.client] Options forwarded to {@link kratosClientPlugin}
 * @param {import('vite').UserConfig} [options.vite] Extra Vite config merged on top
 * @returns {import('vite').UserConfigFn}
 */
export function kratosViewsVite(options = {}) {
	const {
		template = 'views.html',
		ssrEntry = 'src/views/entry-server.tsx',
		clientOutDir = 'dist/views/client',
		serverOutDir = 'dist/views/server',
		base = '/views/',
		vite = {},
	} = options;

	return (env = {}) => {
		// `env.isSsrBuild` is the primary signal, but `vite build --ssr` (boolean flag,
		// no entry) does not always populate it in the config function — fall back to the
		// CLI argv so a single config file drives both the client and SSR builds.
		const isSsrBuild = !!env.isSsrBuild || process.argv.includes('--ssr');

		/** @type {import('vite').UserConfig} */
		const config = {
			base,
			plugins: [
				react({ include: /\.(tsx?|jsx)$/, jsxRuntime: 'automatic' }),
				kratosClientPlugin(options.client ?? {}),
				...(vite.plugins ?? []),
			],
			resolve: {
				dedupe: ['react', 'react-dom', 'react-hook-form'],
				...(vite.resolve ?? {}),
			},
			server: {
				allowedHosts: true,
				fs: { strict: false },
				...(vite.server ?? {}),
			},
			optimizeDeps: {
				include: ['react', 'react-dom', 'react-hook-form'],
				...(vite.optimizeDeps ?? {}),
			},
			build: isSsrBuild
				? {
						outDir: serverOutDir,
						ssr: ssrEntry,
						emptyOutDir: true,
						...(vite.build ?? {}),
					}
				: {
						outDir: clientOutDir,
						emptyOutDir: true,
						manifest: true,
						chunkSizeWarningLimit: 2000,
						...(vite.build ?? {}),
						rollupOptions: {
							input: template,
							...(vite.build?.rollupOptions ?? {}),
						},
					},
		};

		return config;
	};
}
