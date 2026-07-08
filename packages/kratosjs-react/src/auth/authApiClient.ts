import { AuthUser, AuthProvider, AuthTokens, LoginCredentials, LoginResult } from './types';

/**
 * In-flight refresh requests, keyed by API base URL. Navigating the panel fires many API
 * calls at once; when the access token has just expired they all 401 together. Rather than
 * each firing its own POST /auth/refresh, the first request performs the single refresh and
 * every other caller (across all AuthApiClient instances for this base URL) awaits the same
 * promise, then retries. One refresh, one new access-token cookie, shared by everyone.
 */
const inFlightRefresh = new Map<string, Promise<AuthTokens | null>>();

/**
 * API client for authentication endpoints.
 * Tokens are managed via HTTP-only cookies set by the server — no localStorage involved.
 */
export class AuthApiClient {
	constructor(private apiBaseUrl: string) {}

	async getProviders(): Promise<AuthProvider[]> {
		const response = await fetch(`${this.apiBaseUrl}/auth/providers`, {
			credentials: 'include',
		});
		if (!response.ok) {
			throw new Error('Failed to fetch providers');
		}
		const data = await response.json();
		return data.providers || [];
	}

	/**
	 * Attempt login. Returns a discriminated result: `authenticated` (session cookie set)
	 * or `challenge` (a verification step like 2FA is required before tokens are issued).
	 */
	async login(provider: string, credentials: LoginCredentials): Promise<LoginResult> {
		const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ provider, ...credentials }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Login failed');
		}

		return response.json();
	}

	/**
	 * Respond to a pending login challenge. Returns the next `LoginResult` — either
	 * `authenticated` (all steps cleared) or another `challenge` (chained step).
	 */
	async verifyChallenge(challengeToken: string, type: string, payload: unknown): Promise<LoginResult> {
		const response = await fetch(`${this.apiBaseUrl}/auth/challenge`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			credentials: 'include',
			body: JSON.stringify({ challengeToken, type, payload }),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Verification failed');
		}

		return response.json();
	}

	async getCurrentUser(): Promise<AuthUser | null> {
		const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
			credentials: 'include',
		});

		if (!response.ok) {
			if (response.status === 401) {
				const error: any = new Error('Unauthorized');
				error.status = 401;
				throw error;
			}
			throw new Error('Failed to get current user');
		}

		const data = await response.json();
		return data.user || null;
	}

	/**
	 * Silently refresh the session. Concurrent calls (across every AuthApiClient instance for
	 * this API base URL) share a single request so only one token rotation occurs — see
	 * {@link inFlightRefresh}.
	 */
	async refreshToken(): Promise<AuthTokens | null> {
		const existing = inFlightRefresh.get(this.apiBaseUrl);
		if (existing) return existing;

		const request = (async (): Promise<AuthTokens | null> => {
			const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({}),
			});

			if (!response.ok) {
				return null;
			}

			const data = await response.json();
			return data.tokens || null;
		})();

		inFlightRefresh.set(this.apiBaseUrl, request);
		try {
			return await request;
		} finally {
			inFlightRefresh.delete(this.apiBaseUrl);
		}
	}

	async logout(): Promise<void> {
		try {
			await fetch(`${this.apiBaseUrl}/auth/logout`, {
				method: 'POST',
				credentials: 'include',
			});
		} catch {
			// Ignore errors — server-side cookie clearing is best-effort
		}
	}

	getAuthHeaders(): HeadersInit {
		return {};
	}
}
