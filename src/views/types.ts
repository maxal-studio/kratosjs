import type { HttpMethod, KratosReply, KratosRequest } from '../http/types';

/**
 * The reply handed to a route handler registered via `panel.route(...)`. Adds
 * `view()` (render a React page) and `back()` (redirect to the referrer, optionally
 * flashing errors) on top of the neutral {@link KratosReply}. Every `.route()`
 * handler receives this, so any route may render a view or a plain JSON/HTML body.
 */
export interface KratosViewReply extends KratosReply {
	/**
	 * Render a React page. On a full browser navigation this returns SSR'd HTML with
	 * the page object embedded; on a client-router navigation (X-Kratos-View header)
	 * it returns the page object as JSON. Props may be values, promises, functions,
	 * or `lazyProp(...)` markers.
	 */
	view(component: string, props?: Record<string, unknown>, options?: ViewReplyOptions): Promise<void>;

	/** 303-redirect back to the Referer (fallback '/'), optionally flashing `{ errors }`. */
	back(data?: { errors?: Record<string, string> } & Record<string, unknown>): void;
}

export interface ViewReplyOptions {
	/** Override the HTTP status (default 200; ignored for JSON view responses). */
	status?: number;
}

/** A terminal route handler (last argument to `panel.route`) — receives the view-capable reply. */
export type KratosViewHandler = (req: KratosRequest, reply: KratosViewReply) => void | Promise<void>;

/**
 * The `panel.route()` handler shape used for inference: like a middleware, but its
 * reply is the view-capable {@link KratosViewReply}. All-but-last arguments act as
 * middleware (they call `next`); the last is the terminal handler.
 */
export type KratosRouteFn = (
	req: KratosRequest,
	reply: KratosViewReply,
	next: () => Promise<void>,
) => void | Promise<void>;

/** Config carried by the {@link adminRoute} marker middleware. */
export interface AdminRouteConfig {
	auth: 'required' | 'optional';
}

/** Global configuration for the Views system, set via `panel.views(...)`. */
export interface ViewsConfig {
	/** App-root-relative HTML shell template file (default 'views.html'). */
	template?: string;
	/** Public URL base for built view assets (default '/views/'). */
	assetsBase?: string;
	/** Where `viewAuth` failures redirect a browser (default `${panelPath}/login`). */
	loginPath?: string;
	/** Enable CSRF cookie minting on view renders / verification in `csrfProtection` (default true). */
	csrf?: boolean;
	/** Asset version override for staleness checks (default: hash of the client manifest). */
	version?: string | (() => string);
}

export interface ResolvedViewsConfig {
	template: string;
	assetsBase: string;
	loginPath: string;
	csrf: boolean;
	version?: string | (() => string);
}

export type ViewShareFn = (req: KratosRequest) => Record<string, unknown> | Promise<Record<string, unknown>>;

/** A buffered route (from `panel.route(...)`), resolved during `start()` into the route table. */
export interface BufferedRoute {
	method: HttpMethod;
	path: string;
	/** All-but-last act as middleware; the last is the terminal handler. */
	handlers: KratosRouteFn[];
	/** Present when marked via {@link adminRoute}: prefix basePath + attach auth. */
	admin?: AdminRouteConfig;
	source: 'app' | 'plugin';
}
