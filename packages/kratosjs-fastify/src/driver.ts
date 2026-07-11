import type { FastifyReply, FastifyRequest } from 'fastify';
import type { KratosRequest, Panel, ReplyDriver } from '@maxal_studio/kratosjs';
import { buildKratosRequest } from '@maxal_studio/kratosjs';

/**
 * ReplyDriver over a fastify Reply. Cookie serialization, redirects, and
 * content types are all handled by KratosJs core — this only forwards primitives.
 */
export class FastifyReplyDriver implements ReplyDriver {
	constructor(private reply: FastifyReply) {}

	get raw(): unknown {
		return this.reply;
	}

	setStatus(code: number): void {
		this.reply.code(code);
	}

	setHeader(name: string, value: string): void {
		this.reply.header(name, value);
	}

	appendHeader(name: string, value: string): void {
		// fastify's reply.header() special-cases set-cookie: repeated calls append
		// instead of overwrite, so no manual merging (that would duplicate values).
		if (name.toLowerCase() === 'set-cookie') {
			this.reply.header(name, value);
			return;
		}
		const existing = this.reply.getHeader(name);
		if (existing === undefined) {
			this.reply.header(name, value);
		} else if (Array.isArray(existing)) {
			this.reply.header(name, [...existing, value]);
		} else {
			this.reply.header(name, [String(existing), value]);
		}
	}

	sendBody(body: string | Buffer): void {
		// Strings/Buffers pass through fastify untouched (no JSON serialization),
		// with the Content-Type core already set.
		this.reply.send(body);
	}
}

/**
 * Build the framework-neutral KratosRequest from a fastify Request.
 */
export function toKratosRequest(request: FastifyRequest, panel: Panel): KratosRequest {
	// Honor x-forwarded-proto directly (contract behavior, same on every adapter)
	// instead of fastify's request.protocol, which ignores it unless trustProxy is set.
	const forwardedProto = request.headers['x-forwarded-proto'];
	const protocol =
		typeof forwardedProto === 'string' && forwardedProto ? forwardedProto.split(',')[0].trim() : request.protocol;

	return buildKratosRequest({
		method: request.method,
		url: request.url,
		protocol,
		host: request.headers.host,
		ip: request.ip,
		params: (request.params ?? {}) as Record<string, string>,
		query: { ...((request.query ?? {}) as Record<string, any>) },
		body: request.body,
		headers: request.headers,
		raw: request,
		panel,
	});
}
