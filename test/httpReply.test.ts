import { describe, expect, it } from 'vitest';
import { createReply } from '../src/http/reply';
import { parseCookieHeader, serializeCookie, serializeClearCookie } from '../src/http/cookies';
import { buildKratosRequest, parseByteSize } from '../src/http/request';
import { composeHandler } from '../src/http/pipeline';
import type { KratosMiddleware, ReplyDriver } from '../src/http/types';
import { createStubPanel } from '../src/http/testing/contractSuite';

/** Recording driver: captures everything core does with the reply. */
function recordingDriver() {
	const record = {
		status: 0,
		headers: {} as Record<string, string[]>,
		body: undefined as string | Buffer | undefined,
		ended: false,
	};
	const driver: ReplyDriver = {
		raw: record,
		setStatus: code => (record.status = code),
		setHeader: (name, value) => (record.headers[name.toLowerCase()] = [value]),
		appendHeader: (name, value) => {
			const key = name.toLowerCase();
			record.headers[key] = [...(record.headers[key] || []), value];
		},
		sendBody: body => {
			record.body = body;
			record.ended = true;
		},
	};
	return { driver, record };
}

describe('cookie serialization', () => {
	it('serializes all attributes, converting maxAge ms → seconds', () => {
		const cookie = serializeCookie('token', 'a b', {
			httpOnly: true,
			secure: true,
			sameSite: 'none',
			path: '/api/auth/refresh',
			domain: 'example.com',
			maxAge: 90_000,
		});
		expect(cookie).toBe(
			'token=a%20b; Max-Age=90; Path=/api/auth/refresh; Domain=example.com; HttpOnly; Secure; SameSite=None',
		);
	});

	it('clear-cookie expires at the epoch and keeps path/domain', () => {
		const cookie = serializeClearCookie('token', { path: '/x' });
		expect(cookie).toContain('token=');
		expect(cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
		expect(cookie).toContain('Path=/x');
	});

	it('parses cookie headers (first occurrence wins, quoted + encoded values)', () => {
		expect(parseCookieHeader('a=1; b="two"; a=ignored; c=hello%20world')).toEqual({
			a: '1',
			b: 'two',
			c: 'hello world',
		});
		expect(parseCookieHeader(undefined)).toEqual({});
	});
});

describe('createReply', () => {
	it('json sets content type and serializes', () => {
		const { driver, record } = recordingDriver();
		const reply = createReply(driver);
		reply.status(201).json({ ok: true });
		expect(record.status).toBe(201);
		expect(record.headers['content-type'][0]).toContain('application/json');
		expect(record.body).toBe('{"ok":true}');
		expect(reply.sent).toBe(true);
	});

	it('send respects a pre-set content type and defaults to text/plain', () => {
		const preset = recordingDriver();
		const replyA = createReply(preset.driver);
		replyA.header('Content-Type', 'text/csv').send('a,b');
		expect(preset.record.headers['content-type'][0]).toBe('text/csv');

		const fallback = recordingDriver();
		const replyB = createReply(fallback.driver);
		replyB.send('plain');
		expect(fallback.record.headers['content-type'][0]).toContain('text/plain');
	});

	it('redirect sets status and Location', () => {
		const { driver, record } = recordingDriver();
		createReply(driver).redirect('/next');
		expect(record.status).toBe(302);
		expect(record.headers['location'][0]).toBe('/next');
	});

	it('cookies append without clobbering', () => {
		const { driver, record } = recordingDriver();
		const reply = createReply(driver);
		reply.cookie('a', '1').cookie('b', '2').json({});
		expect(record.headers['set-cookie']).toHaveLength(2);
	});

	it('double-send throws outside production', () => {
		const { driver } = recordingDriver();
		const reply = createReply(driver);
		reply.json({ first: true });
		expect(() => reply.json({ second: true })).toThrow(/already sent/);
	});
});

describe('buildKratosRequest', () => {
	it('derives path, lowercases headers, parses cookies, binds media helpers', async () => {
		const panel = createStubPanel();
		const req = buildKratosRequest({
			method: 'post',
			url: '/api/users?active=1',
			protocol: 'http',
			headers: { 'Content-Type': 'application/json', Cookie: 'session=xyz', Host: 'localhost:9999' },
			raw: { native: true },
			panel,
		});

		expect(req.method).toBe('POST');
		expect(req.path).toBe('/api/users');
		expect(req.url).toBe('/api/users?active=1');
		expect(req.host).toBe('localhost:9999');
		expect(req.cookies).toEqual({ session: 'xyz' });
		expect(req.header('content-type')).toBe('application/json');
		expect(req.header('CONTENT-TYPE')).toBe('application/json');
		expect(req.raw).toEqual({ native: true });
		expect(await req.formatMediaKey('k')).toEqual({ key: 'k', bucket: 'default' });
	});

	it('parses byte sizes', () => {
		expect(parseByteSize('50mb')).toBe(50 * 1024 * 1024);
		expect(parseByteSize('1gb')).toBe(1024 * 1024 * 1024);
		expect(parseByteSize('512')).toBe(512);
		expect(() => parseByteSize('nope')).toThrow();
	});
});

describe('composeHandler', () => {
	function fakeReqReply() {
		const { driver, record } = recordingDriver();
		const reply = createReply(driver);
		const req = buildKratosRequest({
			method: 'GET',
			url: '/x',
			protocol: 'http',
			headers: {},
			raw: {},
			panel: createStubPanel(),
		});
		return { req, reply, record };
	}

	it('runs steps in order and stops when a step responds without next()', async () => {
		const order: string[] = [];
		const stepA: KratosMiddleware = async (_req, _reply, next) => {
			order.push('a');
			await next();
		};
		const stepB: KratosMiddleware = async (_req, reply) => {
			order.push('b');
			reply.status(401).json({ error: 'no' });
		};

		const { req, reply, record } = fakeReqReply();
		await composeHandler([stepA, stepB], async () => {
			order.push('handler');
		})(req, reply);

		expect(order).toEqual(['a', 'b']);
		expect(record.status).toBe(401);
	});

	it('maps thrown errors through handleError', async () => {
		const { req, reply, record } = fakeReqReply();
		await composeHandler([], async () => {
			throw new Error('User not found');
		})(req, reply);
		expect(record.status).toBe(404);
	});

	it('detects double next()', async () => {
		const bad: KratosMiddleware = async (_req, _reply, next) => {
			await next();
			await next();
		};
		const { req, reply, record } = fakeReqReply();
		await composeHandler([bad], async (_req, r) => r.json({ ok: true }))(req, reply);
		// The second next() throws; response was already sent, so the error is only logged.
		expect(record.body).toBe('{"ok":true}');
	});
});
