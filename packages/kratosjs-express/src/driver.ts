import type { Request, Response } from 'express';
import type { KratosRequest, Panel, ReplyDriver } from '@maxal_studio/kratosjs';
import { buildKratosRequest } from '@maxal_studio/kratosjs';

/**
 * ReplyDriver over an express Response. Cookie serialization, redirects, and
 * content types are all handled by KratosJs core — this only forwards primitives.
 */
export class ExpressReplyDriver implements ReplyDriver {
	constructor(private res: Response) {}

	get raw(): unknown {
		return this.res;
	}

	setStatus(code: number): void {
		this.res.status(code);
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

/**
 * Build the framework-neutral KratosRequest from an express Request.
 */
export function toKratosRequest(req: Request, panel: Panel): KratosRequest {
	// Honor x-forwarded-proto directly (contract behavior, same on every adapter)
	// instead of express's req.protocol, which ignores it unless 'trust proxy' is set.
	const forwardedProto = req.headers['x-forwarded-proto'];
	const protocol =
		typeof forwardedProto === 'string' && forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol;

	return buildKratosRequest({
		method: req.method,
		url: req.originalUrl || req.url,
		protocol,
		host: req.get('host'),
		ip: req.ip,
		params: req.params as Record<string, string>,
		query: { ...(req.query as Record<string, any>) },
		body: req.body,
		headers: req.headers,
		raw: req,
		panel,
	});
}
