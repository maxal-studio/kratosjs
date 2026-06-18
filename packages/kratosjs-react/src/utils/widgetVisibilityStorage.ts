const WIDGET_VISIBILITY_KEY = 'kratosjs_widgets_expanded';

/** Default when no preference stored: desktop expanded, mobile collapsed */
export function getDefaultWidgetsExpanded(): boolean {
	if (typeof window === 'undefined') return true;
	return window.matchMedia('(min-width: 768px)').matches;
}

/**
 * Storage for widgets expanded/collapsed state.
 * When no value is stored, mobile should be collapsed and desktop expanded (handled in component via media query).
 */
export const widgetVisibilityStorage = {
	get(): boolean | null {
		try {
			const stored = localStorage.getItem(WIDGET_VISIBILITY_KEY);
			if (stored === 'true') return true;
			if (stored === 'false') return false;
			return null;
		} catch {
			return null;
		}
	},

	set(expanded: boolean): void {
		try {
			localStorage.setItem(WIDGET_VISIBILITY_KEY, String(expanded));
		} catch (error) {
			if (error instanceof Error && error.name === 'QuotaExceededError') {
				console.warn('localStorage quota exceeded, widgets visibility not saved');
			}
		}
	},

	clear(): void {
		localStorage.removeItem(WIDGET_VISIBILITY_KEY);
	},
};
