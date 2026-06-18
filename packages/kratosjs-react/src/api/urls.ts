/**
 * URL derivation helpers shared by the table, modals and API clients.
 */

/**
 * Derive the panel API base URL from a resource API URL.
 *
 * - `.../api/users` -> `.../api`
 * - `.../api/users/1/relations/posts` -> `.../api`
 */
export function deriveApiBaseUrl(apiUrl: string): string {
	if (apiUrl.includes('/relations/')) {
		const baseUrl = apiUrl.substring(0, apiUrl.indexOf('/relations/'));
		// Remove the record id segment to get back to the api base
		return baseUrl.substring(0, baseUrl.lastIndexOf('/'));
	}
	return apiUrl.substring(0, apiUrl.lastIndexOf('/'));
}

/** Last path segment of a resource API URL (the resource slug). */
export function resourceSlugFromUrl(apiUrl: string): string {
	return apiUrl.split('/').filter(Boolean).pop() || '';
}

/** Deterministic, short, filesystem/localStorage-safe hash of a string. */
export function hashString(str: string): string {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) - hash + char;
		hash = hash & hash; // Convert to 32-bit integer
	}
	return Math.abs(hash).toString(36);
}

/**
 * Stable key for per-resource localStorage entries (column visibility, layout).
 * Non-resource tables hash the URL; relation tables use the relation slug.
 */
export function resourceStorageKey(apiUrl: string, isResource: boolean, relatedResourceSlug?: string): string {
	if (!isResource) {
		return hashString(apiUrl);
	}
	if (relatedResourceSlug) {
		return relatedResourceSlug.replace(/[^a-zA-Z0-9_]/g, '_');
	}
	const segments = apiUrl.split('/').filter(Boolean);
	const lastSegment = segments[segments.length - 1] || segments[segments.length - 2] || 'resource';
	return lastSegment.replace(/[^a-zA-Z0-9_]/g, '_');
}
