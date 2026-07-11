import type { Context } from 'koa';
import type { KratosRequest, Panel, ReplyDriver } from '@maxal_studio/kratosjs';
import { buildKratosRequest } from '@maxal_studio/kratosjs';

/**
 * ReplyDriver over a Koa Context.
 *
 * Koa's context is mutable (like Express) but the response is flushed lazily
 * after the middleware chain resolves. Koa also infers the Content-Type from
 * `ctx.body` — but only when it isn't already set, and core always sets the
 * Content-Type header before the body, so the value core chose is preserved.
 */
export class KoaReplyDriver implements ReplyDriver {
	constructor(private ctx: Context) {}

	get raw(): unknown {
		return this.ctx;
	}

	setStatus(code: number): void {
		this.ctx.status = code;
	}

	setHeader(name: string, value: string): void {
		this.ctx.set(name, value);
	}

	appendHeader(name: string, value: string): void {
		this.ctx.append(name, value);
	}

	sendBody(body: string | Buffer): void {
		// Koa's body setter promotes a still-default 404 to 200; core sets an explicit
		// status beforehand when it needs one, so this only affects unset responses.
		this.ctx.body = body;
	}
}

/**
 * Build the framework-neutral KratosRequest from a Koa Context.
 */
export function toKratosRequest(ctx: Context, panel: Panel): KratosRequest {
	// Honor x-forwarded-proto directly (contract behavior, same on every adapter)
	// instead of Koa's ctx.protocol, which needs app.proxy to trust the header.
	const forwardedProto = ctx.headers['x-forwarded-proto'];
	const protocol =
		typeof forwardedProto === 'string' && forwardedProto ? forwardedProto.split(',')[0].trim() : ctx.protocol;

	return buildKratosRequest({
		method: ctx.method,
		url: ctx.url,
		protocol,
		host: ctx.host,
		ip: ctx.ip,
		params: (ctx.params ?? {}) as Record<string, string>,
		query: { ...(ctx.query as Record<string, any>) },
		// @koa/bodyparser leaves an unparsed body as `undefined`; a parsed empty
		// body is `{}` — both are fine for the neutral request.
		body: (ctx.request as any).body,
		headers: ctx.headers,
		raw: ctx,
		panel,
	});
}
