/**
 * Decode JWT token without verification (for getting expiration time)
 */
export function decodeJWT(token: string): { exp?: number; iat?: number } | null {
	try {
		const base64Url = token.split('.')[1];
		if (!base64Url) {
			return null;
		}

		const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split('')
				.map(c => {
					return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
				})
				.join(''),
		);

		return JSON.parse(jsonPayload);
	} catch (error) {
		return null;
	}
}

/**
 * Get token expiration time in seconds from now
 */
export function getTokenExpirationTime(token: string): number | null {
	const decoded = decodeJWT(token);
	if (!decoded || !decoded.exp) {
		return null;
	}

	// exp is in seconds, Date.now() is in milliseconds
	const expirationTime = decoded.exp * 1000;
	const now = Date.now();
	const secondsUntilExpiry = Math.floor((expirationTime - now) / 1000);

	return secondsUntilExpiry > 0 ? secondsUntilExpiry : null;
}
