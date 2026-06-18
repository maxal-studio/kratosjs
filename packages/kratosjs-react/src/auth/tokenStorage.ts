const ACCESS_TOKEN_KEY = 'kratosjs_access_token';
const REFRESH_TOKEN_KEY = 'kratosjs_refresh_token';

/**
 * Token storage utilities for managing auth tokens in localStorage
 */
export const tokenStorage = {
	/**
	 * Get access token from storage
	 */
	getAccessToken(): string | null {
		return localStorage.getItem(ACCESS_TOKEN_KEY);
	},

	/**
	 * Set access token in storage
	 */
	setAccessToken(token: string): void {
		localStorage.setItem(ACCESS_TOKEN_KEY, token);
	},

	/**
	 * Get refresh token from storage
	 */
	getRefreshToken(): string | null {
		return localStorage.getItem(REFRESH_TOKEN_KEY);
	},

	/**
	 * Set refresh token in storage
	 */
	setRefreshToken(token: string): void {
		localStorage.setItem(REFRESH_TOKEN_KEY, token);
	},

	/**
	 * Clear all tokens from storage
	 */
	clear(): void {
		localStorage.removeItem(ACCESS_TOKEN_KEY);
		localStorage.removeItem(REFRESH_TOKEN_KEY);
	},
};
