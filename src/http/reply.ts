import type { CookieOptions, KratosReply, ReplyDriver } from './types';
import { serializeCookie, serializeClearCookie } from './cookies';

/**
 * Build the framework-neutral {@link KratosReply} over an adapter-supplied {@link ReplyDriver}.
 *
 * Core owns all response semantics (cookie serialization, redirect status, JSON
 * content types, double-send protection) so every adapter behaves identically —
 * an adapter only translates the five ReplyDriver calls to its native response.
 */
export function createReply(driver: ReplyDriver): KratosReply {
	let sent = false;
	let contentTypeSet = false;

	const markSent = (method: string): boolean => {
		if (sent) {
			const message = `[kratosjs] reply.${method}() called after the response was already sent`;
			if (process.env.NODE_ENV === 'production') {
				console.warn(message);
				return false;
			}
			throw new Error(message);
		}
		sent = true;
		return true;
	};

	const reply: KratosReply = {
		get sent() {
			return sent;
		},

		get raw() {
			return driver.raw;
		},

		status(code: number) {
			driver.setStatus(code);
			return reply;
		},

		header(name: string, value: string) {
			if (name.toLowerCase() === 'content-type') {
				contentTypeSet = true;
			}
			driver.setHeader(name, value);
			return reply;
		},

		cookie(name: string, value: string, options?: CookieOptions) {
			driver.appendHeader('Set-Cookie', serializeCookie(name, value, options));
			return reply;
		},

		clearCookie(name: string, options?: Pick<CookieOptions, 'path' | 'domain'>) {
			driver.appendHeader('Set-Cookie', serializeClearCookie(name, options));
			return reply;
		},

		json(payload: unknown) {
			if (!markSent('json')) return;
			driver.setHeader('Content-Type', 'application/json; charset=utf-8');
			driver.sendBody(JSON.stringify(payload));
		},

		send(body: string | Buffer) {
			if (!markSent('send')) return;
			if (!contentTypeSet) {
				driver.setHeader('Content-Type', 'text/plain; charset=utf-8');
			}
			driver.sendBody(body);
		},

		html(body: string) {
			if (!markSent('html')) return;
			driver.setHeader('Content-Type', 'text/html; charset=utf-8');
			driver.sendBody(body);
		},

		redirect(url: string, statusCode: number = 302) {
			if (!markSent('redirect')) return;
			driver.setStatus(statusCode);
			driver.setHeader('Location', url);
			driver.sendBody('');
		},

		redirectTo(path: string, data?: Record<string, any>) {
			reply.json({ redirect: path, ...data });
		},
	};

	return reply;
}
