/**
 * The wire protocol for the Inertia-style Views system.
 *
 * Views are a public-site layer independent of the admin panel: a first browser
 * visit gets server-rendered HTML with a page object embedded; subsequent
 * client-side navigations send the `X-Kratos-View` header and receive the page
 * object as JSON only (no full document reload). This module owns the header
 * names, the page-object shape, and prop resolution (partial reloads + lazy props).
 */

/** Request header set by the client router to ask for a JSON page instead of HTML. */
export const VIEW_HEADER = 'x-kratos-view';
/** Request header carrying the client's asset-manifest version for staleness checks. */
export const VIEW_VERSION_HEADER = 'x-kratos-view-version';
/** Request header: comma-separated prop names to include (partial reload). */
export const VIEW_ONLY_HEADER = 'x-kratos-view-only';
/** Request header: comma-separated prop names to exclude (partial reload). */
export const VIEW_EXCEPT_HEADER = 'x-kratos-view-except';
/** Request header: the component the partial reload targets (partials apply only when it matches). */
export const VIEW_COMPONENT_HEADER = 'x-kratos-view-component';
/** Request header echoing the CSRF cookie (double-submit) on non-GET view routes. */
export const CSRF_HEADER = 'x-kratos-csrf';

/** Response header on JSON page responses; the client asserts it before parsing. */
export const VIEW_RESPONSE_HEADER = 'X-Kratos-View';
/** Response header telling the client router to hard-navigate to this URL (409 responses). */
export const VIEW_LOCATION_HEADER = 'X-Kratos-Location';

/** Non-httpOnly cookie holding the CSRF token (readable by the client router). */
export const CSRF_COOKIE = 'kratosjs_csrf';
/** Short-lived httpOnly cookie carrying `{ errors, ... }` across a `back()` redirect. */
export const FLASH_COOKIE = 'kratosjs_view_flash';

/** The `<script type="application/json">` id that carries the page object in SSR HTML. */
export const VIEW_PAGE_ELEMENT_ID = '__KRATOS_VIEW_PAGE__';

/**
 * The page object embedded in server-rendered HTML and returned as JSON on view
 * requests. The client router swaps components/props from this without a reload.
 */
export interface ViewPage {
	/** Registry key of the React page: 'blog/Show' (app) or 'blog::Post/Show' (plugin). */
	component: string;
	/** Resolved props merged with shared props; the `errors` key is reserved for form errors. */
	props: Record<string, unknown>;
	/** Request path including query string. */
	url: string;
	/** Short hash of the client asset manifest; `null` in development. */
	version: string | null;
}

const LAZY_MARKER = Symbol('kratosjs.lazyProp');

/**
 * A prop that is evaluated only when explicitly requested by name in a partial
 * reload (`router.reload({ only: ['stats'] })`). Skipped on full page loads.
 */
export interface LazyProp {
	[LAZY_MARKER]: true;
	factory: () => unknown;
}

/** Mark a prop as lazy — evaluated only when named in a partial reload. */
export function lazyProp(factory: () => unknown): LazyProp {
	return { [LAZY_MARKER]: true, factory };
}

export function isLazyProp(value: unknown): value is LazyProp {
	return typeof value === 'object' && value !== null && (value as Record<symbol, unknown>)[LAZY_MARKER] === true;
}

/** Parse a comma-separated header value into a trimmed, non-empty string list. */
export function parseHeaderList(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map(part => part.trim())
		.filter(part => part.length > 0);
}

/**
 * Resolve a prop bag into concrete values, honoring partial-reload filtering and
 * lazy props. Function props and promises are awaited so handlers can pass
 * `{ posts: () => em.find(Post, {}) }`.
 *
 * - Full load (`partial` false): every key except lazy props.
 * - Partial with `only`: exactly the named keys (lazy props included when named).
 * - Partial with `except`: all keys except the named ones and lazy props.
 */
export async function resolveProps(
	props: Record<string, unknown>,
	options: { only?: string[]; except?: string[]; partial?: boolean } = {},
): Promise<Record<string, unknown>> {
	const { only = [], except = [], partial = false } = options;
	const keys = Object.keys(props);

	let activeKeys: string[];
	if (partial && only.length > 0) {
		activeKeys = keys.filter(key => only.includes(key));
	} else if (partial && except.length > 0) {
		activeKeys = keys.filter(key => !except.includes(key) && !isLazyProp(props[key]));
	} else {
		activeKeys = keys.filter(key => !isLazyProp(props[key]));
	}

	const resolved: Record<string, unknown> = {};
	for (const key of activeKeys) {
		let value = props[key];
		if (isLazyProp(value)) {
			value = value.factory();
		} else if (typeof value === 'function') {
			value = (value as () => unknown)();
		}
		resolved[key] = await value;
	}
	return resolved;
}

/**
 * Serialize a page object for embedding in an HTML `<script>` tag, escaping `<`
 * so a string prop can never break out of the tag (mirrors the admin i18n inject).
 */
export function serializeViewPage(page: ViewPage): string {
	return JSON.stringify(page).replace(/</g, '\\u003c');
}
