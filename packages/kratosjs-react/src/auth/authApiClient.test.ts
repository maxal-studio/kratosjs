import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthApiClient } from './authApiClient';

// The single-flight guard exists so that when the panel fires many API calls at once and
// they all 401 on an expired access token, only ONE /auth/refresh request is made: the first
// caller refreshes and the rest await it, then retry. Keeps a burst of 401s from stampeding
// the refresh endpoint.

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('AuthApiClient.refreshToken single-flight', () => {
	it('coalesces concurrent refreshes into one network request', async () => {
		let resolveFetch: (v: unknown) => void = () => {};
		const fetchMock = vi.fn(
			() =>
				new Promise(resolve => {
					resolveFetch = resolve;
				}),
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new AuthApiClient('https://example.test/api');

		// Three overlapping refreshes while the request is still in flight.
		const p1 = client.refreshToken();
		const p2 = client.refreshToken();
		const p3 = client.refreshToken();

		expect(fetchMock).toHaveBeenCalledTimes(1);

		resolveFetch({ ok: true, json: async () => ({ tokens: { expiresIn: 900 } }) });
		const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

		expect(r1).toEqual({ expiresIn: 900 });
		expect(r2).toEqual({ expiresIn: 900 });
		expect(r3).toEqual({ expiresIn: 900 });
	});

	it('allows a fresh refresh after the previous one settled', async () => {
		const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ tokens: { expiresIn: 900 } }) }));
		vi.stubGlobal('fetch', fetchMock);

		const client = new AuthApiClient('https://example.test/api');
		await client.refreshToken();
		await client.refreshToken();

		// Sequential (non-overlapping) calls each hit the network.
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('resolves null and clears the in-flight slot on a failed refresh', async () => {
		const fetchMock = vi.fn(async () => ({ ok: false, json: async () => ({}) }));
		vi.stubGlobal('fetch', fetchMock);

		const client = new AuthApiClient('https://example.test/api');
		expect(await client.refreshToken()).toBeNull();
		// A later attempt is not stuck behind the failed promise.
		expect(await client.refreshToken()).toBeNull();
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});
});
