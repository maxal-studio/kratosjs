import { Block } from './blocks/Block';
import { getRequestContext } from './RequestContextStorage';
import type { NavigationBadge } from './panel/types';

export interface SerializedPage {
	slug: string;
	label: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	blocks: any[]; // SerializedBlock[]
}

/**
 * Base Page class for custom pages
 * Pages can contain blocks (widgets, forms, tables, tabs) to create custom views
 *
 * @example
 * ```typescript
 * export class DashboardPage extends Page {
 *     static slug = 'dashboard';
 *     static label = 'Dashboard';
 *     static icon = 'LayoutDashboard';
 *     static navigationGroup = 'Main';
 *     static navigationSort = 1;
 *
 *     static blocks() {
 *         const context = this.getContext();
 *         // Access context?.user, context?.query, etc.
 *         return [
 *             WidgetBlock.make(userWidget),
 *             FormBlock.make(formSchema),
 *         ];
 *     }
 * }
 * ```
 */
export abstract class Page {
	/**
	 * URL slug for the page (e.g., 'dashboard', 'profile')
	 * Used in API routes: /api/pages/{slug}
	 */
	static slug: string;

	/**
	 * Display label for the page
	 */
	static label: string;

	/**
	 * Icon for the page (Lucide icon name)
	 */
	static icon?: string;

	/**
	 * Navigation group for organizing pages in the sidebar
	 */
	static navigationGroup?: string;

	/**
	 * Sort order within the navigation group
	 */
	static navigationSort?: number;

	/**
	 * Hide from navigation
	 */
	static hidden?: boolean;

	/**
	 * Exclude from route registration
	 * When true, the page will not have routes registered in the React app
	 * This is different from hidden, which hides from navigation but still allows direct URL access
	 */
	static excluded?: boolean;

	/**
	 * Optional: return a badge for the page in the navigation (e.g. count or label and color).
	 * Override in subclasses; used by GET /meta/badges.
	 * Request context (e.g. user) is available via getRequestContext() from RequestContextStorage.
	 * Return { value, color? } where color is e.g. 'blue', 'green', 'red', 'yellow', 'gray' or a CSS color.
	 */
	static getNavigationBadge?(): Promise<NavigationBadge | null | undefined>;

	/**
	 * Get the current request context (user, query, body, headers, etc.).
	 * Use this inside blocks() to access request data.
	 */
	static getContext() {
		return getRequestContext();
	}

	/**
	 * Define the blocks for this page
	 * Override this method in your page class.
	 * Use this.getContext() inside to get the current request context.
	 */
	static async blocks(): Promise<Block[]> {
		return [];
	}

	/**
	 * Serialize page to JSON
	 */
	static async toJSON(): Promise<SerializedPage> {
		const blocks = await this.blocks();
		return {
			slug: this.slug,
			label: this.label,
			icon: this.icon,
			navigationGroup: this.navigationGroup,
			navigationSort: this.navigationSort,
			blocks: blocks.map(block => block.toJSON()),
		};
	}
}
