import { tokenStorage } from '../auth/tokenStorage';
import { AuthApiClient } from '../auth/authApiClient';

/**
 * Authenticated fetch wrapper that automatically handles token refresh on 401 errors
 * @param url - The URL to fetch
 * @param options - Fetch options (method, headers, body, etc.)
 * @param apiBaseUrl - Base URL for the API (used for token refresh)
 * @returns Promise<Response>
 */
export async function authenticatedFetch(
	url: string,
	options: RequestInit = {},
	apiBaseUrl: string,
): Promise<Response> {
	// Get current access token
	const token = tokenStorage.getAccessToken();
	const headers = new Headers({
		'Content-Type': 'application/json',
		...options.headers,
	});

	// Add authorization header if token exists
	if (token) {
		headers.set('Authorization', `Bearer ${token}`);
	}

	// Make initial request
	let response = await fetch(url, {
		...options,
		headers,
	});

	// If 401, try to refresh token and retry
	if (response.status === 401) {
		const authClient = new AuthApiClient(apiBaseUrl);
		const tokens = await authClient.refreshToken();

		if (tokens) {
			// Retry request with new token
			const newToken = tokenStorage.getAccessToken();
			if (newToken) {
				headers.set('Authorization', `Bearer ${newToken}`);
				response = await fetch(url, {
					...options,
					headers,
				});
			}
		} else {
			// Refresh failed - return the 401 response
			return response;
		}
	}

	// If server signals to refresh navigation badges, dispatch event for AdminPanel to refetch
	if (response.ok && response.headers.get('X-KratosJs-Refresh-Badges')) {
		window.dispatchEvent(new CustomEvent('kratosjs-refresh-badges'));
	}

	return response;
}
