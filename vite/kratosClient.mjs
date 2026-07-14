import fs from 'fs';
import path from 'path';

const VIRTUAL_ID = 'virtual:kratos-client';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

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

	const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
	const entries = [];
	for (const dep of Object.keys(deps)) {
		const depPkgPath = path.join(root, 'node_modules', dep, 'package.json');
		if (!fs.existsSync(depPkgPath)) continue;
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
