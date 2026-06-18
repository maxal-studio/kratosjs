/**
 * Layout storage utilities for managing table/grid layout preferences in localStorage
 */
export const layoutStorage = {
	/**
	 * Get layout preference for a resource
	 * @param resourceKey Unique identifier for the resource (e.g., 'users', 'posts')
	 * @param defaultLayout Default layout to return if no preference is stored
	 * @returns 'table' or 'grid'
	 */
	getLayout(resourceKey: string, defaultLayout: 'table' | 'grid' = 'table'): 'table' | 'grid' {
		try {
			const key = `kratosjs_layout_${resourceKey}`;
			const stored = localStorage.getItem(key);
			if (stored === 'table' || stored === 'grid') {
				return stored;
			}
			return defaultLayout;
		} catch (error) {
			console.warn('Failed to read layout preference from localStorage:', error);
			return defaultLayout;
		}
	},

	/**
	 * Set layout preference for a resource
	 * @param resourceKey Unique identifier for the resource
	 * @param layout Layout mode - 'table' or 'grid'
	 */
	setLayout(resourceKey: string, layout: 'table' | 'grid'): void {
		try {
			const key = `kratosjs_layout_${resourceKey}`;
			localStorage.setItem(key, layout);
		} catch (error) {
			// Handle quota exceeded or other localStorage errors
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				console.warn('localStorage quota exceeded, layout preference not saved');
			} else {
				console.warn('Failed to save layout preference to localStorage:', error);
			}
		}
	},

	/**
	 * Clear stored layout preference for a resource
	 * @param resourceKey Unique identifier for the resource
	 */
	clearLayout(resourceKey: string): void {
		const key = `kratosjs_layout_${resourceKey}`;
		localStorage.removeItem(key);
	},
};
