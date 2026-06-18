import { vi } from 'vitest';

export interface MockRoute {
	/** Substring or RegExp matched against the request URL */
	match: string | RegExp;
	/** Optional HTTP method filter (defaults to any) */
	method?: string;
	status?: number;
	headers?: Record<string, string>;
	/** JSON body to respond with, or a function of (url, init) */
	body: unknown | ((url: string, init?: RequestInit) => unknown);
}

export interface RecordedRequest {
	url: string;
	method: string;
	body: unknown;
}

/**
 * Stub global fetch with a small route table. Returns the list of recorded
 * requests so tests can assert on payloads. Routes are matched in order;
 * unmatched requests resolve with 404 to surface mistakes loudly.
 */
export function mockFetch(routes: MockRoute[]): RecordedRequest[] {
	const requests: RecordedRequest[] = [];

	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
			const method = (init?.method || 'GET').toUpperCase();
			let parsedBody: unknown = undefined;
			if (typeof init?.body === 'string') {
				try {
					parsedBody = JSON.parse(init.body);
				} catch {
					parsedBody = init.body;
				}
			}
			requests.push({ url, method, body: parsedBody });

			for (const route of routes) {
				const urlMatches = typeof route.match === 'string' ? url.includes(route.match) : route.match.test(url);
				const methodMatches = !route.method || route.method.toUpperCase() === method;
				if (urlMatches && methodMatches) {
					const body = typeof route.body === 'function' ? route.body(url, init) : route.body;
					return new Response(JSON.stringify(body), {
						status: route.status ?? 200,
						headers: { 'Content-Type': 'application/json', ...route.headers },
					});
				}
			}

			return new Response(JSON.stringify({ message: `No mock route for ${method} ${url}` }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}),
	);

	return requests;
}

export function restoreFetch(): void {
	vi.unstubAllGlobals();
}
