import type { Panel } from '../Panel';
import type { AuthUser } from '../auth/types';
import type { RegisteredResource } from '../panel/types';
import type { SerializedForm } from '../formbuilder/types';

/**
 * HTTP methods supported by the route table.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Framework-neutral HTTP request.
 *
 * Adapters build this from their native request via {@link import('./request').buildKratosRequest};
 * the Kratos pipeline then populates `authUser`, `panelResource`, etc. Handler code written
 * against this type runs unchanged on any HTTP adapter (Express, Fastify, ...).
 */
export interface KratosRequest {
	/** Uppercase HTTP method: 'GET', 'POST', ... */
	method: string;

	/** URL path without the query string, e.g. '/kratosjs/api/users/list' */
	path: string;

	/** Path including the query string, e.g. '/greet?name=x' */
	url: string;

	/** 'http' or 'https' (honors x-forwarded-proto when the adapter provides it) */
	protocol: string;

	/** Host header value, e.g. 'localhost:3000' */
	host?: string;

	/** Client IP address (for rate-limit / audit hooks) */
	ip?: string;

	/** Named path parameters from the route pattern (':resource', ':id', ...) */
	params: Record<string, string>;

	/** Parsed query string parameters */
	query: Record<string, any>;

	/** Parsed request body (JSON) */
	body: any;

	/** Request headers, lowercase keys */
	headers: Record<string, string | string[] | undefined>;

	/** Parsed cookies from the Cookie header */
	cookies: Record<string, string>;

	/** Case-insensitive single-header accessor (first value when the header repeats) */
	header(name: string): string | undefined;

	/**
	 * Escape hatch: the framework-native request object
	 * (express.Request, FastifyRequest, node IncomingMessage, ...).
	 */
	raw: unknown;

	// ---- Populated by the Kratos pipeline (never by adapters) ----

	/** The Panel handling this request */
	panel: Panel;

	/** Authenticated user (present after the auth pipeline step; absent on optional-auth routes without a token) */
	authUser?: AuthUser;

	/** The registered resource for the current route (present on `/:resource/...` routes) */
	panelResource?: RegisteredResource;

	/** Transform media fields in data to storage format */
	transformMediaFieldsForStorage(data: Record<string, any>, formSchema: SerializedForm): Promise<void>;

	/** Format a media key with bucket information */
	formatMediaKey(key: string, bucketName?: string): Promise<{ key: string; bucket: string }>;

	/** Resolve a media value to a URL */
	resolveMediaUrl(mediaValue: any): Promise<string | undefined>;
}

/**
 * Cookie attributes for {@link KratosReply.cookie}.
 * `maxAge` is in milliseconds (Express convention, preserved from v1);
 * core converts to seconds when serializing the Set-Cookie header.
 */
export interface CookieOptions {
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: 'lax' | 'strict' | 'none';
	path?: string;
	domain?: string;
	/** Lifetime in milliseconds */
	maxAge?: number;
	expires?: Date;
}

/**
 * Framework-neutral HTTP response.
 *
 * Implemented once by core over a {@link ReplyDriver} so status/header/cookie/redirect
 * semantics are identical on every adapter. `json`, `send`, `html`, `redirect` are
 * terminal — calling a second terminal method throws in development.
 */
export interface KratosReply {
	status(code: number): this;
	header(name: string, value: string): this;
	cookie(name: string, value: string, options?: CookieOptions): this;
	clearCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>): this;

	/** Send a JSON response (sets Content-Type: application/json) */
	json(payload: unknown): void;

	/** Send a raw body. Set Content-Type via header() first; defaults to text/plain. */
	send(body: string | Buffer): void;

	/** Send an HTML response (sets Content-Type: text/html; charset=utf-8) */
	html(body: string): void;

	/** Real HTTP redirect via the Location header (302 by default) */
	redirect(url: string, statusCode?: number): void;

	/** JSON-level redirect helper: responds `{ redirect: path, ...data }` (v1 `res.redirectTo`) */
	redirectTo(path: string, data?: Record<string, any>): void;

	/** True once a terminal method ran — the pipeline stops when a step has responded */
	readonly sent: boolean;

	/** Escape hatch: the framework-native response object */
	raw: unknown;
}

/**
 * Neutral route handler. Custom routes, plugin routes, and (fully composed) panel routes
 * all have this shape.
 */
export type KratosHandler = (req: KratosRequest, reply: KratosReply) => void | Promise<void>;

/**
 * Neutral middleware. Call `next()` to continue the chain; respond via `reply`
 * (without calling `next()`) to short-circuit.
 */
export type KratosMiddleware = (
	req: KratosRequest,
	reply: KratosReply,
	next: () => Promise<void>,
) => void | Promise<void>;

/**
 * What `panel.registerRoute()` accepts: a final handler `(req, reply)` or — for
 * every argument but the last — middleware that also receives `next`.
 * One type (instead of a union) so TypeScript can contextually infer the
 * parameter types of inline arrow functions.
 */
export type KratosRouteHandler = (
	req: KratosRequest,
	reply: KratosReply,
	next: () => Promise<void>,
) => void | Promise<void>;

/**
 * One entry of the declarative route table core hands to the HTTP adapter.
 * `handler` is fully composed — auth, ORM context, request context, and error handling
 * are already wrapped inside it. Adapters never implement middleware semantics.
 */
export interface RouteDefinition {
	method: HttpMethod;

	/**
	 * Absolute route path (already prefixed with the panel base path).
	 * Pattern language is ':name' segments only — no regexes, wildcards, or optional segments.
	 */
	path: string;

	/** The fully composed handler for this route */
	handler: KratosHandler;

	/** Where the route came from (debugging / getRegisteredRoutes) */
	source: 'panel' | 'auth' | 'plugin' | 'app';
}

/**
 * A static-files mount (`panel.useStatic(urlPath, directory)`).
 */
export interface StaticMount {
	urlPath: string;
	directory: string;
}

/**
 * CORS configuration passed to adapters. `false` disables CORS handling.
 */
export type CorsOptions = { origin: boolean | string | string[]; credentials: boolean } | false;

/**
 * Everything an adapter needs to create and configure its native app.
 * Passed to {@link import('./KratosHttpAdapter').KratosHttpAdapter.init}.
 */
export interface AdapterInitContext {
	panel: Panel;

	/** Panel base path, e.g. '/kratosjs/api' */
	basePath: string;

	/**
	 * Admin UI mount path, e.g. '/admin'. `'/'` (the default) means the SPA is a
	 * whole-domain catch-all; a non-root value scopes the SPA + its assets to that
	 * path so everything outside it falls through (404 / the app's own routes).
	 */
	panelPath: string;

	/**
	 * JSON body size limit the adapter must allow (file uploads travel as base64 JSON).
	 * Human-readable byte size, e.g. '50mb'.
	 */
	bodyLimit: string;

	cors: CorsOptions;
}

/**
 * The raw material adapters hand to {@link import('./request').buildKratosRequest}.
 * Everything derivable (cookies, header lookup, media helpers) is filled in by core.
 */
export interface KratosRequestInit {
	method: string;
	/** Path including query string */
	url: string;
	protocol: string;
	host?: string;
	ip?: string;
	params?: Record<string, string>;
	query?: Record<string, any>;
	body?: any;
	headers: Record<string, string | string[] | undefined>;
	raw: unknown;
	panel: Panel;
}

/**
 * The 5-method surface an adapter implements so core can drive its native response.
 * Core's {@link import('./reply').createReply} builds the full {@link KratosReply} on top,
 * guaranteeing identical cookie/redirect/error semantics on every framework.
 */
export interface ReplyDriver {
	setStatus(code: number): void;
	setHeader(name: string, value: string): void;
	/** Append without clobbering (multiple Set-Cookie headers) */
	appendHeader(name: string, value: string): void;
	/** Terminal: write the body and end the response */
	sendBody(body: string | Buffer): void;
	/** The framework-native response object */
	raw: unknown;
}
