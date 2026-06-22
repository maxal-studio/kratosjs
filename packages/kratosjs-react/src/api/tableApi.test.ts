import { afterEach, describe, expect, it, vi } from 'vitest';
import { TableApiClient } from './tableApi';
import { mockFetch, restoreFetch } from '../test/mockFetch';

const API = 'http://api.test/admin';
const LIST_URL = `${API}/users`;

describe('TableApiClient', () => {
	afterEach(() => {
		restoreFetch();
	});

	it('posts query params to baseUrl + fetchPath and returns the result', async () => {
		const result = {
			data: [{ id: 1 }],
			pagination: { page: 1, limit: 25, total: 1, pages: 1, hasNext: false, hasPrev: false },
		};
		const requests = mockFetch([{ match: '/users/list', body: result }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		const data = await client.fetchData({ page: 1, perPage: 25, search: 'jane' });

		expect(data).toEqual(result);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].body).toEqual({ page: 1, perPage: 25, search: 'jane' });
	});

	it('sends credentials:include and no Authorization header on requests', async () => {
		mockFetch([{ match: '/users/list', body: { data: [], pagination: {} } }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		await client.fetchData({});

		const fetchMock = globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } };
		const init = fetchMock.mock.calls[0][1];
		expect(init?.credentials).toBe('include');
		expect(new Headers(init?.headers).get('Authorization')).toBeNull();
	});

	it('throws an unauthorized error on 401 when refresh is not possible', async () => {
		mockFetch([{ match: '/users/list', status: 401, body: { message: 'nope' } }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		await expect(client.fetchData({})).rejects.toThrow(/Unauthorized/);
	});

	it('calls the refresh endpoint and retries on 401', async () => {
		const calls: { url: string; init?: RequestInit }[] = [];
		let listCallCount = 0;

		vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			calls.push({ url, init });

			if (url.includes('/auth/refresh')) {
				return new Response(JSON.stringify({ tokens: { expiresIn: 900 } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			listCallCount++;
			if (listCallCount === 1) {
				return new Response(JSON.stringify({ message: 'expired' }), {
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ data: [{ id: 7 }], pagination: {} }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			});
		}) as typeof fetch);

		const client = new TableApiClient(API, LIST_URL, '/list');
		const result = await client.fetchData({});

		expect(result.data).toEqual([{ id: 7 }]);
		expect(calls.some(c => c.url.includes('/auth/refresh'))).toBe(true);
		// Retry must also use credentials:include — no localStorage involved
		const retryCall = calls.find(c => c.url.includes('/users/list') && calls.indexOf(c) > 0);
		expect(retryCall?.init?.credentials).toBe('include');
	});

	it('unwraps { data } from updateRecord responses', async () => {
		mockFetch([{ match: '/users/update/5', body: { data: { id: 5, name: 'x' }, metadata: {} } }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		const updated = await client.updateRecord(5, { name: 'x' });
		expect(updated).toEqual({ id: 5, name: 'x' });
	});

	it('returns the full body from deleteRecords', async () => {
		const body = { deleted: [1, 2], metadata: { refreshBadges: true } };
		const requests = mockFetch([{ match: '/users/bulk-delete', body }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		const result = await client.deleteRecords([1, 2]);

		expect(result).toEqual(body);
		expect(requests[0].body).toEqual({ ids: [1, 2] });
	});

	it('strips trailing slashes from the base url', () => {
		const client = new TableApiClient(API, `${LIST_URL}/`, '/list');
		expect(client.getBaseUrl()).toBe(LIST_URL);
	});
});
