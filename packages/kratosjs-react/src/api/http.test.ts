import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApiError, apiFetch, apiGet, apiPost } from './http';
import { mockFetch, restoreFetch } from '../test/mockFetch';

const API = 'http://api.test/admin';

describe('apiFetch', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	afterEach(() => {
		restoreFetch();
	});

	it('returns parsed JSON on success', async () => {
		mockFetch([{ match: '/things', body: { hello: 'world' } }]);
		const result = await apiGet<{ hello: string }>(`${API}/things`, API);
		expect(result).toEqual({ hello: 'world' });
	});

	it('throws ApiError with the server message on failure', async () => {
		mockFetch([{ match: '/things', status: 422, body: { message: 'Name is required' } }]);

		const error = await apiPost(`${API}/things`, {}, API).catch(e => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error.status).toBe(422);
		expect(error.message).toBe('Name is required');
		expect(error.details).toEqual({ message: 'Name is required' });
	});

	it('uses a friendly message for 401s', async () => {
		mockFetch([{ match: '/things', status: 401, body: { message: 'jwt expired' } }]);

		const error = await apiGet(`${API}/things`, API).catch(e => e);
		expect(error).toBeInstanceOf(ApiError);
		expect(error.isUnauthorized).toBe(true);
		expect(error.message).toBe('Unauthorized - Please login again');
	});

	it('tolerates empty response bodies', async () => {
		mockFetch([]);
		// Manually return empty 204-like response
		restoreFetch();
		const { vi } = await import('vitest');
		vi.stubGlobal('fetch', async () => new Response('', { status: 200 }));

		const result = await apiFetch(`${API}/things`, { apiBaseUrl: API });
		expect(result).toBeNull();
	});

	it('posts JSON payloads', async () => {
		const requests = mockFetch([{ match: '/things', body: { ok: true } }]);
		await apiPost(`${API}/things`, { a: 1 }, API);
		expect(requests[0].method).toBe('POST');
		expect(requests[0].body).toEqual({ a: 1 });
	});
});
