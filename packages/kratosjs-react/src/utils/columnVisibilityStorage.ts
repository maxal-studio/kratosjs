/**
 * Column visibility storage utilities for managing column visibility preferences in localStorage
 */
export const columnVisibilityStorage = {
	/**
	 * Get hidden columns for a resource
	 * @param resourceKey Unique identifier for the resource (e.g., 'users', 'users_posts')
	 * @returns Array of hidden column names, or null if not found (never been set)
	 */
	getHiddenColumns(resourceKey: string): string[] | null {
		try {
			const key = `kratosjs_column_visibility_${resourceKey}`;
			const stored = localStorage.getItem(key);
			if (stored === null) {
				return null;
			}
			const parsed = JSON.parse(stored);
			if (Array.isArray(parsed)) {
				return parsed;
			}
			return null;
		} catch (error) {
			console.warn('Failed to parse column visibility from localStorage:', error);
			return null;
		}
	},

	/**
	 * Set hidden columns for a resource
	 * @param resourceKey Unique identifier for the resource
	 * @param hiddenColumns Array of column names that should be hidden
	 */
	setHiddenColumns(resourceKey: string, hiddenColumns: string[]): void {
		try {
			const key = `kratosjs_column_visibility_${resourceKey}`;
			localStorage.setItem(key, JSON.stringify(hiddenColumns));
		} catch (error) {
			// Handle quota exceeded or other localStorage errors
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				console.warn('localStorage quota exceeded, column visibility preferences not saved');
			} else {
				console.warn('Failed to save column visibility to localStorage:', error);
			}
		}
	},

	/**
	 * Clear stored column visibility preferences for a resource
	 * @param resourceKey Unique identifier for the resource
	 */
	clearHiddenColumns(resourceKey: string): void {
		const key = `kratosjs_column_visibility_${resourceKey}`;
		localStorage.removeItem(key);
	},
};
