import { AuthUser, AuthProvider, AuthTokens, LoginCredentials } from './types';
import { tokenStorage } from './tokenStorage';

/**
 * API client for authentication endpoints
 */
export class AuthApiClient {
	constructor(private apiBaseUrl: string) {}

	/**
	 * Get available authentication providers
	 */
	async getProviders(): Promise<AuthProvider[]> {
		const response = await fetch(`${this.apiBaseUrl}/auth/providers`);
		if (!response.ok) {
			throw new Error('Failed to fetch providers');
		}
		const data = await response.json();
		return data.providers || [];
	}

	/**
	 * Login with a provider
	 */
	async login(provider: string, credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
		const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				provider,
				...credentials,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Login failed');
		}

		const data = await response.json();

		// Store tokens
		if (data.tokens) {
			tokenStorage.setAccessToken(data.tokens.accessToken);
			tokenStorage.setRefreshToken(data.tokens.refreshToken);
		}

		return {
			user: data.user,
			tokens: data.tokens,
		};
	}

	/**
	 * Get current authenticated user
	 */
	async getCurrentUser(): Promise<AuthUser | null> {
		const token = tokenStorage.getAccessToken();
		if (!token) {
			return null;
		}

		const response = await fetch(`${this.apiBaseUrl}/auth/me`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				// Token expired or invalid - throw error so caller can handle refresh
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
	 * Refresh access token using refresh token
	 */
	async refreshToken(): Promise<AuthTokens | null> {
		const refreshToken = tokenStorage.getRefreshToken();
		if (!refreshToken) {
			return null;
		}

		const response = await fetch(`${this.apiBaseUrl}/auth/refresh`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refreshToken,
			}),
		});

		if (!response.ok) {
			tokenStorage.clear();
			return null;
		}

		const data = await response.json();

		// Update stored tokens
		if (data.tokens) {
			tokenStorage.setAccessToken(data.tokens.accessToken);
			tokenStorage.setRefreshToken(data.tokens.refreshToken);
		}

		return data.tokens || null;
	}

	/**
	 * Logout - clear tokens on server and client
	 */
	async logout(): Promise<void> {
		try {
			await fetch(`${this.apiBaseUrl}/auth/logout`, {
				method: 'POST',
			});
		} catch (error) {
			// Ignore errors - clear tokens anyway
		} finally {
			tokenStorage.clear();
		}
	}

	/**
	 * Get authorization headers with access token
	 */
	getAuthHeaders(): HeadersInit {
		const token = tokenStorage.getAccessToken();
		if (!token) {
			return {};
		}
		return {
			Authorization: `Bearer ${token}`,
		};
	}
}
