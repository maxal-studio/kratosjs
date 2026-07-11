/**
 * The admin UI mount path the server injected as `window.__VALAJS_PANEL_PATH__`.
 *
 * React Router (`navigate`, `<Link>`, `useLocation`) becomes basename-aware once
 * `<BrowserRouter basename>` is set, so those need no help. But **raw**
 * `window.history.*` writes and **raw** `window.location.pathname` reads bypass the
 * router — this module prefixes/strips the panel path for exactly those spots.
 *
 * All helpers are no-ops when the panel is at the root ('/').
 */

/** The panel UI base path ('/' when the admin is served at the domain root). */
export function getPanelBasePath(): string {
	return (window as unknown as { __VALAJS_PANEL_PATH__?: string }).__VALAJS_PANEL_PATH__ || '/';
}

/** Router `basename` — `undefined` at root (BrowserRouter wants no basename there). */
export function getRouterBasename(): string | undefined {
	const base = getPanelBasePath();
	return base === '/' ? undefined : base;
}

/**
 * Prefix a root-relative app path with the panel base, for RAW `history.replaceState`/
 * `pushState` and shareable ("copy link") URLs. `/users/1` → `/admin/users/1`.
 */
export function withPanelBase(rootRelative: string): string {
	const base = getPanelBasePath();
	if (base === '/') {
		return rootRelative;
	}
	const suffix = rootRelative.startsWith('/') ? rootRelative : `/${rootRelative}`;
	return `${base}${suffix}`;
}

/**
 * Strip the panel base from a RAW `window.location.pathname` so downstream logic works
 * in root-relative space (matching React Router's basename-stripped `useLocation`).
 * `/admin/users/1` → `/users/1`; `/admin` → `/`.
 */
export function stripPanelBase(pathname: string): string {
	const base = getPanelBasePath();
	if (base === '/') {
		return pathname;
	}
	if (pathname === base) {
		return '/';
	}
	if (pathname.startsWith(`${base}/`)) {
		return pathname.slice(base.length);
	}
	return pathname;
}
