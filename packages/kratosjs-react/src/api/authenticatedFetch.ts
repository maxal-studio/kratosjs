import { AuthApiClient } from '../auth/authApiClient';
import { getActiveLocale } from '../i18n/activeLocale';

/**
 * Fetch wrapper that automatically retries with a silent token refresh on 401.
 * Auth tokens are carried by HTTP-only cookies — no Authorization header needed.
 *
 * Sends `X-KratosJs-Locale` so the server localizes labels/schemas/action
 * messages to the admin's current UI locale.
 */
export async function authenticatedFetch(
	url: string,
	options: RequestInit = {},
	apiBaseUrl: string,
): Promise<Response> {
	const headers = new Headers({
		'Content-Type': 'application/json',
		'X-KratosJs-Locale': getActiveLocale(),
		...options.headers,
	});

	let response = await fetch(url, { ...options, headers, credentials: 'include' });

	if (response.status === 401) {
		const authClient = new AuthApiClient(apiBaseUrl);
		const tokens = await authClient.refreshToken();

		if (tokens) {
			response = await fetch(url, { ...options, headers, credentials: 'include' });
		} else {
			return response;
		}
	}

	if (response.ok && response.headers.get('X-KratosJs-Refresh-Badges')) {
		window.dispatchEvent(new CustomEvent('kratosjs-refresh-badges'));
	}

	return response;
}
