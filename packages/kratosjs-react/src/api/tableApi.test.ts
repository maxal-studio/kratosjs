import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TableApiClient } from './tableApi';
import { mockFetch, restoreFetch } from '../test/mockFetch';

const API = 'http://api.test/admin';
const LIST_URL = `${API}/users`;

describe('TableApiClient', () => {
	beforeEach(() => {
		localStorage.clear();
	});

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

	it('sends the access token as a bearer header', async () => {
		localStorage.setItem('kratosjs_access_token', 'tok-123');
		mockFetch([
			{
				match: '/users/list',
				body: { data: [], pagination: {} },
			},
		]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		await client.fetchData({});

		const fetchMock = globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } };
		const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
		expect(headers.get('Authorization')).toBe('Bearer tok-123');
	});

	it('throws an unauthorized error on 401 when refresh is not possible', async () => {
		mockFetch([{ match: '/users/list', status: 401, body: { message: 'nope' } }]);

		const client = new TableApiClient(API, LIST_URL, '/list');
		await expect(client.fetchData({})).rejects.toThrow(/Unauthorized/);
	});

	it('refreshes the token and retries on 401', async () => {
		localStorage.setItem('kratosjs_access_token', 'expired');
		localStorage.setItem('kratosjs_refresh_token', 'refresh-1');

		// mockFetch's route table cannot vary status per call, so stub fetch manually
		const calls: { url: string; init?: RequestInit }[] = [];
		vi.stubGlobal('fetch', (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			calls.push({ url, init });
			if (url.includes('/auth/refresh')) {
				return new Response(JSON.stringify({ tokens: { accessToken: 'fresh', refreshToken: 'refresh-2' } }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			const auth = new Headers(init?.headers).get('Authorization');
			if (auth === 'Bearer fresh') {
				return new Response(JSON.stringify({ data: [{ id: 7 }], pagination: {} }), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}
			return new Response(JSON.stringify({ message: 'expired' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' },
			});
		}) as typeof fetch);

		const client = new TableApiClient(API, LIST_URL, '/list');
		const result = await client.fetchData({});

		expect(result.data).toEqual([{ id: 7 }]);
		expect(localStorage.getItem('kratosjs_access_token')).toBe('fresh');
		expect(calls.some(c => c.url.includes('/auth/refresh'))).toBe(true);
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
