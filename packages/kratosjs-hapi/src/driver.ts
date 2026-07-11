import type { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import type { KratosRequest, Panel, ReplyDriver } from '@maxal_studio/kratosjs';
import { buildKratosRequest } from '@maxal_studio/kratosjs';

/**
 * ReplyDriver for Hapi.
 *
 * Hapi's response model is return-based: a route handler builds a response with
 * the toolkit `h` and RETURNS it, rather than mutating a live response object.
 * So this driver only RECORDS what core does (status, headers, body); the adapter
 * calls {@link toResponse} after the handler resolves to construct the actual
 * Hapi response. Cookie serialization, redirects, and content types are all owned
 * by core — this records the primitives and replays them onto `h.response()`.
 */
export class HapiReplyDriver implements ReplyDriver {
	private status = 200;
	private headers = new Map<string, string[]>();
	private body: string | Buffer = '';

	constructor(private h: ResponseToolkit) {}

	get raw(): unknown {
		return this.h;
	}

	setStatus(code: number): void {
		this.status = code;
	}

	setHeader(name: string, value: string): void {
		this.headers.set(name.toLowerCase(), [value]);
	}

	appendHeader(name: string, value: string): void {
		const key = name.toLowerCase();
		const existing = this.headers.get(key);
		this.headers.set(key, existing ? [...existing, value] : [value]);
	}

	sendBody(body: string | Buffer): void {
		this.body = body;
	}

	/** Build the Hapi response from the recorded state. Called once, after the handler. */
	toResponse(): ResponseObject {
		const response = this.h.response(this.body).code(this.status);

		for (const [name, values] of this.headers) {
			if (name === 'content-type') {
				// Set the content type explicitly. The value core chose already carries a
				// charset (e.g. 'application/json; charset=utf-8'), so Hapi won't append one.
				response.type(values[0]);
			} else if (name === 'set-cookie') {
				// Emit one Set-Cookie header per value (never comma-joined).
				response.header('set-cookie', values[0]);
				for (let i = 1; i < values.length; i++) {
					response.header('set-cookie', values[i], { append: true });
				}
			} else {
				response.header(name, values[0]);
				for (let i = 1; i < values.length; i++) {
					response.header(name, values[i], { append: true });
				}
			}
		}

		return response;
	}
}

/**
 * Build the framework-neutral KratosRequest from a Hapi Request.
 */
export function toKratosRequest(request: Request, panel: Panel): KratosRequest {
	// Honor x-forwarded-proto directly (contract behavior, same on every adapter)
	// instead of Hapi's connection protocol, which ignores the proxy header.
	const forwardedProto = request.headers['x-forwarded-proto'];
	const protocol =
		typeof forwardedProto === 'string' && forwardedProto
			? forwardedProto.split(',')[0].trim()
			: request.url.protocol.replace(/:$/, '') || 'http';

	const host = request.headers.host;

	return buildKratosRequest({
		method: request.method,
		url: request.url.pathname + request.url.search,
		protocol,
		host: Array.isArray(host) ? host[0] : host,
		ip: request.info.remoteAddress,
		params: request.params as Record<string, string>,
		query: { ...(request.query as Record<string, any>) },
		// Hapi uses `null` for an absent payload; the neutral request expects undefined.
		body: request.payload ?? undefined,
		headers: request.headers,
		raw: request,
		panel,
	});
}
