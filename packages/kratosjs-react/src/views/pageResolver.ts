import type { ComponentType } from 'react';

/**
 * A page value. From `import.meta.glob('./pages/**\/*.tsx')` it is a lazy loader
 * `() => Promise<Module>` (or an eager `Module`); from a plugin's `pages` manifest
 * it is a directly-imported component (statically bundled, like plugin fields).
 */
export type PageValue =
	| ComponentType<any>
	| { default: ComponentType<any> }
	| (() => Promise<{ default: ComponentType<any> } | ComponentType<any>>);

export type PageRegistry = Record<string, PageValue>;

/** A page component may declare a persistent layout via a static `layout` property. */
export type PageComponent = ComponentType<any> & { layout?: ComponentType<{ children: any }> };

/**
 * Strip an `import.meta.glob` key down to a component name:
 * './pages/blog/Show.tsx' → 'blog/Show'. Plugin keys (already 'Post/Show') pass through.
 */
export function normalizePageKey(key: string): string {
	return key.replace(/^\.?\/?(?:src\/)?(?:views\/)?pages\//, '').replace(/\.[jt]sx?$/, '');
}

type PageLoader = () => Promise<PageComponent>;

/**
 * App pages come from `import.meta.glob` — a lazy loader `() => Promise<Module>` or,
 * with `{ eager: true }`, the module object. A user may also register a direct
 * component. We distinguish a loader from a component by its return value: a loader
 * returns a thenable; a component either throws (hooks called outside render) or
 * returns a React element — in both cases we treat the original function as the
 * component and never use the invocation's result.
 */
function wrapGlobValue(value: PageValue): PageLoader {
	if (typeof value !== 'function') {
		return async () => ((value as any)?.default ?? value) as PageComponent;
	}
	const fn = value as any;
	// Class components are unambiguous.
	if (fn.prototype?.isReactComponent) {
		return async () => fn as PageComponent;
	}
	return async () => {
		let result: unknown;
		try {
			result = fn();
		} catch {
			// A component whose body threw (e.g. hooks outside render) — it's a component.
			return fn as PageComponent;
		}
		if (result && typeof (result as any).then === 'function') {
			const mod = await (result as Promise<any>);
			return (mod?.default ?? mod) as PageComponent;
		}
		// Returned a React element / undefined synchronously — it was a component.
		return fn as PageComponent;
	};
}

/**
 * Plugin pages are directly-imported components (statically bundled, like plugin
 * fields) — or a `{ default }` module. Never invoked to detect a loader.
 */
function wrapComponentValue(value: PageValue): PageLoader {
	return async () => ((value as any)?.default ?? value) as PageComponent;
}

export interface PageResolver {
	resolve(name: string): Promise<PageComponent>;
	has(name: string): boolean;
	keys(): string[];
}

/**
 * Build a name → component resolver from app page globs and plugin page manifests.
 * Plugin pages are namespaced `'{pluginName}::{key}'` to avoid collisions.
 */
export function buildPageResolver(options: {
	pages?: PageRegistry;
	plugins?: Array<{ name?: string; pages?: PageRegistry }>;
}): PageResolver {
	const map = new Map<string, PageLoader>();

	for (const [key, value] of Object.entries(options.pages ?? {})) {
		map.set(normalizePageKey(key), wrapGlobValue(value));
	}

	for (const plugin of options.plugins ?? []) {
		if (!plugin.pages) continue;
		const prefix = plugin.name ? `${plugin.name}::` : '';
		for (const [key, value] of Object.entries(plugin.pages)) {
			map.set(`${prefix}${normalizePageKey(key)}`, wrapComponentValue(value));
		}
	}

	return {
		has: name => map.has(name),
		keys: () => [...map.keys()],
		async resolve(name) {
			const loader = map.get(name);
			if (!loader) {
				throw new Error(
					`[kratosjs] Unknown view component "${name}". Registered pages: ${[...map.keys()].join(', ') || '(none)'}`,
				);
			}
			return loader();
		},
	};
}
