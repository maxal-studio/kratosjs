/**
 * Handle redirect from API response
 * @param responseData - Response data from API
 * @param navigate - React Router navigate function
 * @returns true if redirect was handled, false otherwise
 */
export function handleRedirect(responseData: any, navigate: (path: string) => void): boolean {
	if (responseData?.redirect) {
		const redirectPath = responseData.redirect;

		// Handle relative paths (client-side navigation)
		if (redirectPath.startsWith('/')) {
			navigate(redirectPath);
			return true;
		}

		// Handle absolute URLs (external redirects)
		if (redirectPath.startsWith('http://') || redirectPath.startsWith('https://')) {
			window.location.href = redirectPath;
			return true;
		}

		// Invalid redirect path
		console.warn('Invalid redirect path:', redirectPath);
		return false;
	}

	return false;
}
