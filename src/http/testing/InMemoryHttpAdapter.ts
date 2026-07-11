import http, { IncomingMessage, Server, ServerResponse } from 'node:http';
import fs from 'fs';
import path from 'path';
import { KratosHttpAdapter } from '../KratosHttpAdapter';
import type { AdapterInitContext, KratosRequest, ReplyDriver, RouteDefinition, StaticMount } from '../types';
import type { AdminSpaService } from '../adminSpa';
import { buildKratosRequest, parseByteSize } from '../request';
import { createReply } from '../reply';

interface MatchedRoute {
	route: RouteDefinition;
	params: Record<string, string>;
}

const MIME_TYPES: Record<string, string> = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.ico': 'image/x-icon',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
};

/**
 * Reference HTTP adapter built on bare node:http — no framework at all.
 *
 * Exists to prove (and test) that the KratosHttpAdapter contract is complete:
 * if KratosJs runs on this, the contract carries everything an adapter needs.
 * Also handy for integration tests that shouldn't depend on Express.
 */
export class InMemoryHttpAdapter extends KratosHttpAdapter {
	readonly name = 'in-memory';

	private ctx!: AdapterInitContext;
	private routes: Array<{ route: RouteDefinition; segments: string[] }> = [];
	private staticMounts: StaticMount[] = [];
	private spa?: AdminSpaService;
	private spaDevMiddlewares?: (req: IncomingMessage, res: ServerResponse, next: (err?: any) => void) => void;
	private server?: Server;
	private bodyLimitBytes = 0;

	init(ctx: AdapterInitContext): void {
		this.ctx = ctx;
		this.bodyLimitBytes = parseByteSize(ctx.bodyLimit);
	}

	registerRoute(route: RouteDefinition): void {
		this.routes.push({ route, segments: route.path.split('/').filter(Boolean) });
	}

	useStatic(mount: StaticMount): void {
		this.staticMounts.push(mount);
	}

	async serveAdminSpa(spa: AdminSpaService): Promise<void> {
		this.spa = spa;
		if (spa.mode === 'development') {
			const dev = await spa.createDevServer();
			this.spaDevMiddlewares = dev.middlewares;
		}
	}

	async listen(port: number, callback?: () => void): Promise<void> {
		this.server = http.createServer((req, res) => {
			this.handle(req, res).catch(error => {
				console.error('[kratosjs] InMemoryHttpAdapter unhandled error:', error);
				if (!res.headersSent) {
					res.statusCode = 500;
					res.setHeader('Content-Type', 'application/json; charset=utf-8');
					res.end(JSON.stringify({ message: 'Internal server error' }));
				} else {
					res.end();
				}
			});
		});

		await new Promise<void>(resolve => {
			this.server!.listen(port, () => {
				callback?.();
				resolve();
			});
		});
	}

	async close(): Promise<void> {
		await this.spa?.close();
		if (this.server) {
			await new Promise<void>((resolve, reject) => {
				this.server!.close(error => (error ? reject(error) : resolve()));
			});
			this.server = undefined;
		}
	}

	getNative<T = unknown>(): T {
		return this.server as T;
	}

	/** The port the server is listening on (0 → OS-assigned). */
	getPort(): number {
		const address = this.server?.address();
		if (address && typeof address === 'object') {
			return address.port;
		}
		throw new Error('[kratosjs] Server is not listening');
	}

	// ------------------------------------------------------------------
	// Request handling
	// ------------------------------------------------------------------

	private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
		const method = (req.method || 'GET').toUpperCase();
		const url = req.url || '/';
		const queryIndex = url.indexOf('?');
		const pathname = decodeURIComponent(queryIndex === -1 ? url : url.slice(0, queryIndex));

		if (this.applyCors(req, res, method)) {
			return; // preflight handled
		}

		// 1. Routes (registration order = match precedence)
		const matched = this.matchRoute(method, pathname);
		if (matched) {
			await this.dispatch(matched, req, res, url);
			return;
		}

		// 2. Static mounts
		if ((method === 'GET' || method === 'HEAD') && this.tryServeStatic(pathname, res)) {
			return;
		}

		// 3. Admin SPA (scoped to the panel path)
		if (this.spa && this.spa.shouldFallback(method, pathname)) {
			if (this.spa.mode === 'production') {
				const dist = this.spa.adminDistDir!;
				if (this.tryServeFile(path.join(dist, this.spa.assetRelativePath(pathname)), res)) {
					return;
				}
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
				res.end(this.spa.getIndexHtml());
				return;
			}

			// Development: let vite try (assets/HMR), then fall back to index.html
			const dev = await this.spa.createDevServer();
			await new Promise<void>(resolve => {
				this.spaDevMiddlewares!(req, res, () => resolve());
				res.on('finish', () => resolve());
			});
			if (!res.writableEnded) {
				const html = await dev.renderIndexHtml(url);
				res.statusCode = 200;
				res.setHeader('Content-Type', 'text/html; charset=utf-8');
				res.end(html);
			}
			return;
		}

		res.statusCode = 404;
		res.setHeader('Content-Type', 'application/json; charset=utf-8');
		res.end(JSON.stringify({ message: `Cannot ${method} ${pathname}` }));
	}

	/** Reflective CORS (origin: true, credentials) matching the v1 express defaults. Returns true when a preflight was answered. */
	private applyCors(req: IncomingMessage, res: ServerResponse, method: string): boolean {
		const cors = this.ctx.cors;
		if (cors === false) {
			return false;
		}

		const requestOrigin = req.headers.origin;
		let allowOrigin: string | undefined;
		if (cors.origin === true) {
			allowOrigin = requestOrigin || '*';
		} else if (typeof cors.origin === 'string') {
			allowOrigin = cors.origin;
		} else if (Array.isArray(cors.origin) && requestOrigin && cors.origin.includes(requestOrigin)) {
			allowOrigin = requestOrigin;
		}

		if (allowOrigin) {
			res.setHeader('Access-Control-Allow-Origin', allowOrigin);
			res.setHeader('Vary', 'Origin');
		}
		if (cors.credentials) {
			res.setHeader('Access-Control-Allow-Credentials', 'true');
		}

		if (method === 'OPTIONS') {
			res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE');
			const requestHeaders = req.headers['access-control-request-headers'];
			if (requestHeaders) {
				res.setHeader('Access-Control-Allow-Headers', requestHeaders);
			}
			res.statusCode = 204;
			res.end();
			return true;
		}

		return false;
	}

	private matchRoute(method: string, pathname: string): MatchedRoute | undefined {
		const pathSegments = pathname.split('/').filter(Boolean);

		for (const { route, segments } of this.routes) {
			if (route.method !== method || segments.length !== pathSegments.length) {
				continue;
			}

			const params: Record<string, string> = {};
			let ok = true;
			for (let i = 0; i < segments.length; i++) {
				const pattern = segments[i];
				if (pattern.startsWith(':')) {
					params[pattern.slice(1)] = pathSegments[i];
				} else if (pattern !== pathSegments[i]) {
					ok = false;
					break;
				}
			}

			if (ok) {
				return { route, params };
			}
		}

		return undefined;
	}

	private async dispatch(
		matched: MatchedRoute,
		req: IncomingMessage,
		res: ServerResponse,
		url: string,
	): Promise<void> {
		const body = await this.readJsonBody(req, res);
		if (body === TOO_LARGE) {
			return; // 413 already sent
		}
		if (body === INVALID_JSON) {
			return; // 400 already sent
		}

		const kratosRequest: KratosRequest = buildKratosRequest({
			method: matched.route.method,
			url,
			protocol: this.requestProtocol(req),
			ip: req.socket.remoteAddress,
			params: matched.params,
			query: this.parseQuery(url),
			body,
			headers: req.headers,
			raw: req,
			panel: this.ctx.panel,
		});

		const reply = createReply(new NodeReplyDriver(res));
		await matched.route.handler(kratosRequest, reply);

		if (!reply.sent && !res.writableEnded) {
			// Handler finished without responding — mirror a hung express handler as an empty 200 end.
			res.end();
		}
	}

	private requestProtocol(req: IncomingMessage): string {
		const forwarded = req.headers['x-forwarded-proto'];
		if (typeof forwarded === 'string' && forwarded) {
			return forwarded.split(',')[0].trim();
		}
		return (req.socket as any).encrypted ? 'https' : 'http';
	}

	private parseQuery(url: string): Record<string, any> {
		const queryIndex = url.indexOf('?');
		const query: Record<string, any> = {};
		if (queryIndex === -1) {
			return query;
		}
		for (const [key, value] of new URLSearchParams(url.slice(queryIndex + 1))) {
			const existing = query[key];
			if (existing === undefined) {
				query[key] = value;
			} else if (Array.isArray(existing)) {
				existing.push(value);
			} else {
				query[key] = [existing, value];
			}
		}
		return query;
	}

	private async readJsonBody(req: IncomingMessage, res: ServerResponse): Promise<any> {
		const method = (req.method || 'GET').toUpperCase();
		if (method === 'GET' || method === 'HEAD') {
			return undefined;
		}

		const chunks: Buffer[] = [];
		let total = 0;

		const tooLarge = await new Promise<boolean>((resolve, reject) => {
			req.on('data', (chunk: Buffer) => {
				total += chunk.length;
				if (total > this.bodyLimitBytes) {
					resolve(true);
					req.destroy();
					return;
				}
				chunks.push(chunk);
			});
			req.on('end', () => resolve(false));
			req.on('error', reject);
		});

		if (tooLarge) {
			res.statusCode = 413;
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			res.end(JSON.stringify({ message: 'Payload too large' }));
			return TOO_LARGE;
		}

		if (chunks.length === 0) {
			return undefined;
		}

		const contentType = req.headers['content-type'] || '';
		if (!contentType.includes('application/json')) {
			return undefined;
		}

		try {
			return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
		} catch {
			res.statusCode = 400;
			res.setHeader('Content-Type', 'application/json; charset=utf-8');
			res.end(JSON.stringify({ message: 'Invalid JSON body' }));
			return INVALID_JSON;
		}
	}

	private tryServeStatic(pathname: string, res: ServerResponse): boolean {
		for (const mount of this.staticMounts) {
			if (pathname === mount.urlPath || pathname.startsWith(`${mount.urlPath}/`)) {
				const relative = pathname.slice(mount.urlPath.length).replace(/^\//, '');
				const base = path.resolve(mount.directory);
				const filePath = path.resolve(base, relative);
				// Prevent path traversal outside the mount directory
				if (filePath !== base && !filePath.startsWith(base + path.sep)) {
					continue;
				}
				if (this.tryServeFile(filePath, res)) {
					return true;
				}
			}
		}
		return false;
	}

	private tryServeFile(filePath: string, res: ServerResponse): boolean {
		if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
			return false;
		}
		res.statusCode = 200;
		res.setHeader('Content-Type', MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
		res.end(fs.readFileSync(filePath));
		return true;
	}
}

const TOO_LARGE = Symbol('body-too-large');
const INVALID_JSON = Symbol('invalid-json');

/**
 * ReplyDriver over a bare node ServerResponse — the smallest possible driver,
 * and the template for what a real framework driver implements.
 */
class NodeReplyDriver implements ReplyDriver {
	constructor(private res: ServerResponse) {}

	get raw(): unknown {
		return this.res;
	}

	setStatus(code: number): void {
		this.res.statusCode = code;
	}

	setHeader(name: string, value: string): void {
		this.res.setHeader(name, value);
	}

	appendHeader(name: string, value: string): void {
		this.res.appendHeader(name, value);
	}

	sendBody(body: string | Buffer): void {
		this.res.end(body);
	}
}
