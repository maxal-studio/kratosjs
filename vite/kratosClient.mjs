import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const VIRTUAL_ID = 'virtual:kratos-client';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Resolve a dependency's package.json path from the app root using real Node
 * resolution — this walks up to a **hoisted** node_modules (npm/pnpm workspaces put
 * shared deps at the repo root), which a plain `<root>/node_modules/<dep>` check misses.
 * Falls back to the app-local path.
 *
 * @param {NodeRequire} require Require bound to the app root.
 * @param {string} root App root directory.
 * @param {string} dep Dependency name.
 * @returns {string | undefined} Absolute path to the dep's package.json, if found.
 */
function resolveDepPackageJson(require, root, dep) {
	try {
		return require.resolve(`${dep}/package.json`);
	} catch {
		const local = path.join(root, 'node_modules', dep, 'package.json');
		return fs.existsSync(local) ? local : undefined;
	}
}

/**
 * Discover plugin client entry specifiers by scanning the app's dependencies for a
 * `"kratosjs": { "client": "<specifier>" }` field in each dependency's package.json.
 * Reading package.json directly (rather than booting the panel) keeps this
 * deterministic and CI-safe.
 *
 * @param {string} root App root directory (Vite `config.root`).
 * @returns {string[]} Import specifiers, e.g. '@acme/kratos-blog/client'.
 */
function discoverClientEntries(root) {
	const pkgPath = path.join(root, 'package.json');
	if (!fs.existsSync(pkgPath)) return [];

	let pkg;
	try {
		pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
	} catch {
		return [];
	}

	const require = createRequire(pkgPath);
	const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
	const entries = [];
	for (const dep of Object.keys(deps)) {
		const depPkgPath = resolveDepPackageJson(require, root, dep);
		if (!depPkgPath) continue;
		try {
			const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf-8'));
			const client = depPkg.kratosjs?.client;
			if (typeof client === 'string' && client.length > 0) {
				entries.push(client);
			}
		} catch {
			// ignore malformed dependency package.json
		}
	}
	return entries;
}

/**
 * Bare package name of an import specifier ('@acme/blog/client' → '@acme/blog').
 *
 * @param {string} specifier
 * @returns {string}
 */
function packageNameOf(specifier) {
	const parts = specifier.split('/');
	return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/**
 * Package names of every plugin contributing a client manifest. Plugin clients are
 * published as bundler-targeted ESM (extensionless relative imports), so an SSR build
 * must bundle rather than externalize them — Node's ESM resolver cannot load them
 * directly. Feed this to Vite's `ssr.noExternal`.
 *
 * @param {string} [root] App root directory.
 * @param {string[]} [clientEntries] Explicit client specifiers (merged with discovery).
 * @returns {string[]} Package names, e.g. '@acme/kratos-blog'.
 */
export function discoverClientPackages(root = process.cwd(), clientEntries = []) {
	const all = [...discoverClientEntries(root), ...clientEntries];
	return [...new Set(all.map(packageNameOf))];
}

/**
 * Vite plugin exposing `virtual:kratos-client` — a generated module re-exporting
 * every plugin's client manifest as `pluginClients`, so apps never hand-edit their
 * admin/views entry to wire plugins.
 *
 * @param {object} [options]
 * @param {string[]} [options.clientEntries] Explicit client specifiers to include (merged with discovery).
 * @param {boolean} [options.autoDiscover=true] Scan dependencies for the `kratosjs.client` field.
 * @returns {import('vite').Plugin}
 */
export function kratosClientPlugin(options = {}) {
	const { clientEntries = [], autoDiscover = true } = options;
	let root = process.cwd();

	return {
		name: 'kratos-client',
		configResolved(config) {
			root = config.root || process.cwd();
		},
		resolveId(id) {
			if (id === VIRTUAL_ID) return RESOLVED_ID;
			return null;
		},
		load(id) {
			if (id !== RESOLVED_ID) return null;
			const discovered = autoDiscover ? discoverClientEntries(root) : [];
			const all = [...new Set([...discovered, ...clientEntries])];
			const imports = all.map((spec, i) => `import c${i} from ${JSON.stringify(spec)};`).join('\n');
			const list = all.map((_, i) => `c${i}`).join(', ');
			return `${imports}\nexport const pluginClients = [${list}];\n`;
		},
	};
}
