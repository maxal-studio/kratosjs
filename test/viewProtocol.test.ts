import { describe, expect, it } from 'vitest';
import type { Panel } from '../src';
import { buildKratosRequest } from '../src/http/request';
import { createReply } from '../src/http/reply';
import type { ReplyDriver } from '../src/http/types';
import { ViewService } from '../src/views/ViewService';
import type { ResolvedViewsConfig, ViewShareFn } from '../src/views/types';
import {
	lazyProp,
	VIEW_HEADER,
	VIEW_ONLY_HEADER,
	VIEW_COMPONENT_HEADER,
	VIEW_VERSION_HEADER,
} from '../src/views/protocol';
import { encodeFlash } from '../src/views/flash';

/**
 * Unit tests for the Inertia-style view protocol (ViewService.handleView), JSON path.
 * The HTML/SSR path is covered by the example-app e2e (it needs a Vite build).
 */

function makeReply() {
	let status = 200;
	const headers: Record<string, string> = {};
	const setCookies: string[] = [];
	let body: string | Buffer | undefined;
	const driver: ReplyDriver = {
		raw: {},
		setStatus: c => {
			status = c;
		},
		setHeader: (n, v) => {
			headers[n.toLowerCase()] = v;
		},
		appendHeader: (_n, v) => {
			setCookies.push(v);
		},
		sendBody: b => {
			body = b;
		},
	};
	return {
		reply: createReply(driver),
		result: () => ({ status, headers, setCookies, body: body as string | undefined }),
	};
}

function makeRequest(opts: {
	method?: string;
	url?: string;
	headers?: Record<string, string>;
	cookies?: Record<string, string>;
}) {
	const headers: Record<string, string> = { ...(opts.headers ?? {}) };
	if (opts.cookies) {
		headers['cookie'] = Object.entries(opts.cookies)
			.map(([k, v]) => `${k}=${v}`)
			.join('; ');
	}
	return buildKratosRequest({
		method: opts.method ?? 'GET',
		url: opts.url ?? '/',
		protocol: 'http',
		headers,
		raw: {},
		panel: panelStub,
	});
}

const shareFns: ViewShareFn[] = [];
const panelStub = {
	resolveLocale: () => 'en',
	getViewShareFns: () => shareFns,
} as unknown as Panel;

function makeService(overrides: Partial<ResolvedViewsConfig> = {}): ViewService {
	const config: ResolvedViewsConfig = {
		template: 'views.html',
		assetsBase: '/views/',
		loginPath: '/login',
		csrf: true,
		...overrides,
	};
	return new ViewService(panelStub, config, { mode: 'development' });
}

describe('ViewService view protocol (JSON path)', () => {
	it('returns the page object as JSON on a client-router request', async () => {
		const service = makeService();
		const req = makeRequest({ headers: { [VIEW_HEADER]: 'true' }, url: '/blog?page=1' });
		const { reply, result } = makeReply();

		await service.handleView(req, reply, 'blog/Index', { title: 'Blog' });

		const { status, headers, body } = result();
		expect(status).toBe(200);
		expect(headers['x-kratos-view']).toBe('true');
		expect(headers['vary']).toBe('X-Kratos-View');
		const page = JSON.parse(body!);
		expect(page.component).toBe('blog/Index');
		expect(page.url).toBe('/blog?page=1');
		expect(page.props.title).toBe('Blog');
		expect(page.props.auth).toEqual({ user: null });
		expect(page.props.locale).toBe('en');
		expect(page.props.csrf).toBeNull();
	});

	it('filters props to `only` on a partial reload for the same component', async () => {
		const service = makeService();
		const req = makeRequest({
			headers: {
				[VIEW_HEADER]: 'true',
				[VIEW_ONLY_HEADER]: 'a',
				[VIEW_COMPONENT_HEADER]: 'blog/Index',
			},
		});
		const { reply, result } = makeReply();

		await service.handleView(req, reply, 'blog/Index', { a: 1, b: 2 });

		const page = JSON.parse(result().body!);
		expect(page.props.a).toBe(1);
		expect(page.props.b).toBeUndefined();
	});

	it('excludes lazy props unless named in `only`', async () => {
		const service = makeService();

		// Full (non-partial) view request → lazy prop skipped, its factory never runs.
		let ran = false;
		const req1 = makeRequest({ headers: { [VIEW_HEADER]: 'true' } });
		const r1 = makeReply();
		await service.handleView(req1, r1.reply, 'Page', {
			heavy: lazyProp(() => {
				ran = true;
				return 'H';
			}),
		});
		expect(JSON.parse(r1.result().body!).props.heavy).toBeUndefined();
		expect(ran).toBe(false);

		// Partial naming the lazy prop → included and evaluated.
		const req2 = makeRequest({
			headers: { [VIEW_HEADER]: 'true', [VIEW_ONLY_HEADER]: 'heavy', [VIEW_COMPONENT_HEADER]: 'Page' },
		});
		const r2 = makeReply();
		await service.handleView(req2, r2.reply, 'Page', { heavy: lazyProp(() => 'H') });
		expect(JSON.parse(r2.result().body!).props.heavy).toBe('H');
	});

	it('409s with X-Kratos-Location when the asset version drifted', async () => {
		const service = makeService({ version: 'server-v2' });
		const req = makeRequest({
			method: 'GET',
			url: '/blog',
			headers: { [VIEW_HEADER]: 'true', [VIEW_VERSION_HEADER]: 'client-v1' },
		});
		const { reply, result } = makeReply();

		await service.handleView(req, reply, 'blog/Index', {});

		const { status, headers, body } = result();
		expect(status).toBe(409);
		expect(headers['x-kratos-location']).toBe('/blog');
		expect(JSON.parse(body!)).toEqual({ location: '/blog' });
	});

	it('merges viewShare() props and awaits function/promise props', async () => {
		shareFns.push(() => ({ tenant: 'acme' }));
		try {
			const service = makeService();
			const req = makeRequest({ headers: { [VIEW_HEADER]: 'true' } });
			const { reply, result } = makeReply();

			await service.handleView(req, reply, 'Page', {
				posts: async () => [{ id: 1 }],
				count: () => 5,
			});

			const page = JSON.parse(result().body!);
			expect(page.props.tenant).toBe('acme');
			expect(page.props.posts).toEqual([{ id: 1 }]);
			expect(page.props.count).toBe(5);
		} finally {
			shareFns.pop();
		}
	});

	it('reads and clears flash errors into props.errors', async () => {
		const service = makeService();
		const req = makeRequest({
			headers: { [VIEW_HEADER]: 'true' },
			cookies: { kratosjs_view_flash: encodeFlash({ errors: { name: 'Required' } }) },
		});
		const { reply, result } = makeReply();

		await service.handleView(req, reply, 'Page', {});

		const { setCookies, body } = result();
		expect(JSON.parse(body!).props.errors).toEqual({ name: 'Required' });
		// The flash cookie is cleared (an expiring Set-Cookie is emitted).
		expect(setCookies.some(c => c.startsWith('kratosjs_view_flash='))).toBe(true);
	});
});
