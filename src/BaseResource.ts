import { FormBuilder } from './formbuilder';
import { TableBuilder } from './tablebuilder';
import type { Panel } from './Panel';
import type { ActionHandler, NavigationBadge } from './panel/types';
import type { RelationConfig, SerializedRelation, ResourceHooks } from './resource/types';
import type { Widget } from './widgets/Widget';
import type { RequestContext } from './RequestContext';
import { getRequestContext } from './RequestContextStorage';

/**
 * Base Resource class for creating resources
 * Extend this class to define your resources with form, table, and actions
 *
 * @example
 * ```typescript
 * export class UserResource extends BaseResource {
 *     static slug = 'users';
 *     static entity = User; // MikroORM EntitySchema or entity class
 *
 *     static form() {
 *         return FormBuilder.make().schema([
 *             TextInput.make('name').required(),
 *         ]);
 *     }
 *
 *     static table() {
 *         return TableBuilder.make().columns([
 *             TextColumn.make('name'),
 *         ]);
 *     }
 *
 *     static actions() {
 *         return {
 *             archive: async ({ records }) => {
 *                 const em = this.getPanel().getEm();
 *                 await em.nativeUpdate(this.entity, { id: records![0].id }, { archived: true });
 *                 return { success: true, message: 'Archived!' };
 *             },
 *         };
 *     }
 * }
 * ```
 */
export abstract class BaseResource {
	/**
	 * URL slug for the resource (e.g., 'users', 'posts')
	 * Used in API routes: /api/admin/{slug}
	 */
	static slug: string;

	/**
	 * The MikroORM entity (EntitySchema instance or entity class)
	 * Used by the adapter to perform CRUD operations
	 */
	static entity: any;

	/**
	 * Display label for the resource (singular)
	 * Defaults to capitalized slug if not set
	 */
	static label?: string;

	/**
	 * Display label for the resource (plural)
	 * Defaults to label + 's' if not set
	 */
	static pluralLabel?: string;

	/**
	 * Icon for the resource (Lucide icon name)
	 */
	static icon?: string;

	/**
	 * Navigation group for organizing resources in the sidebar
	 */
	static navigationGroup?: string;

	/**
	 * Sort order within the navigation group
	 */
	static navigationSort?: number;

	/**
	 * The panel instance this resource belongs to
	 * Set automatically when resource is registered with a panel
	 */
	protected static _panel: Panel;

	/**
	 * Record title attribute - determines how to display a record's title
	 * Can be a field name (string) or a function that receives the record and returns a string (with HTML support)
	 * Used in Edit and View modals to display titles like "Editing [title]" or "View [title]"
	 */
	static recordTitleAttribute?: string | ((record: any) => string);

	/**
	 * Array of field names to search globally across all resources
	 * Used by the global search feature to determine which fields to search
	 */
	static globallySearchableAttributes?: string[];

	/**
	 * Field name for featured image in search results
	 * Used to display images in global search results
	 */
	static recordFeaturedImageAttribute?: string;

	/**
	 * Hide from navigation
	 */
	static hidden?: boolean;

	/**
	 * Exclude from route registration
	 * When true, the resource will not have routes registered in the React app
	 * This is different from hidden, which hides from navigation but still allows direct URL access
	 */
	static excluded?: boolean;

	/**
	 * Whether records can be created for this resource
	 * Defaults to true if not specified
	 * Set to false to disable create functionality
	 */
	static canCreate?: boolean;

	/**
	 * Whether records can be edited for this resource
	 * Defaults to true if not specified
	 * Set to false to disable edit functionality
	 */
	static canEdit?: boolean;

	/**
	 * Whether records can be deleted for this resource
	 * Defaults to true if not specified
	 * Set to false to disable delete functionality
	 */
	static canDelete?: boolean;

	/**
	 * Whether records can be viewed for this resource
	 * Defaults to true if not specified
	 * Set to false to disable view functionality
	 */
	static canView?: boolean;

	/**
	 * Define the form schema for create/edit operations
	 * Override this method in your resource class
	 */
	static form(): FormBuilder {
		return FormBuilder.make().schema([]);
	}

	/**
	 * Define the table schema for listing operations
	 * Override this method in your resource class
	 */
	static table(): TableBuilder {
		return TableBuilder.make().columns([]);
	}

	/**
	 * Define action handlers for row and bulk actions
	 * Override this method to add custom action logic
	 *
	 * @returns Record of action name to handler function
	 */
	static actions(): Record<string, ActionHandler> {
		return {};
	}

	/**
	 * Define relations for this resource
	 * Override this method to add relations (hasMany, manyToMany)
	 *
	 * @returns Array of relation configurations
	 */
	static relations(): RelationConfig[] {
		return [];
	}

	/**
	 * Define widgets for this resource
	 * Override this method to add widgets (stats, charts)
	 *
	 * @returns Array of widget instances
	 */
	static widgets(): Widget[] {
		return [];
	}

	/**
	 * Define hooks for resource lifecycle events
	 * Override this method to add hook handlers
	 *
	 * @returns ResourceHooks configuration
	 */
	static hooks(): ResourceHooks {
		return {};
	}

	/**
	 * Get the panel instance this resource belongs to
	 */
	static getPanel(): Panel {
		return this._panel;
	}

	/**
	 * Set the panel instance (called by Panel.resources())
	 * @internal
	 */
	static setPanel(panel: Panel): void {
		this._panel = panel;
	}

	/**
	 * Get the current request context (user, query, body, headers, resolveMediaUrl, etc.).
	 * Available in form(), table(), widgets(), actions(), hooks, and any code running
	 * during a request. Returns undefined when called outside a request (e.g. at registration).
	 *
	 * Context is set automatically by the Panel for each request via AsyncLocalStorage,
	 * so concurrent requests are isolated.
	 */
	static getContext(): RequestContext | undefined {
		return getRequestContext();
	}

	/**
	 * Get the resource slug
	 */
	static getSlug(): string {
		return this.slug;
	}

	/**
	 * Get the MikroORM entity
	 */
	static getEntity(): any {
		return this.entity;
	}

	/**
	 * Get display label (singular)
	 */
	static getLabel(): string {
		if (this.label) return this.label;
		// Capitalize first letter of slug
		return this.slug.charAt(0).toUpperCase() + this.slug.slice(1, -1);
	}

	/**
	 * Get display label (plural)
	 */
	static getPluralLabel(): string {
		if (this.pluralLabel) return this.pluralLabel;
		if (this.label) return this.label + 's';
		// Capitalize first letter of slug
		return this.slug.charAt(0).toUpperCase() + this.slug.slice(1);
	}

	/**
	 * Get icon name
	 */
	static getIcon(): string | undefined {
		return this.icon;
	}

	/**
	 * Get navigation group
	 */
	static getNavigationGroup(): string | undefined {
		return this.navigationGroup;
	}

	/**
	 * Get navigation sort order
	 */
	static getNavigationSort(): number | undefined {
		return this.navigationSort;
	}

	/**
	 * Optional: return a badge for the resource in the navigation (e.g. count and color).
	 * Override in subclasses; used by GET /meta/badges.
	 * Can use this.getPanel().getEm().count(this.entity, {...}) for counts.
	 * Request context (e.g. user) is available via getRequestContext() from RequestContextStorage.
	 * Return { value, color? } where color is e.g. 'blue', 'green', 'red', 'yellow', 'gray' or a CSS color.
	 */
	static getNavigationBadge?(): Promise<NavigationBadge | null | undefined>;

	/**
	 * Get whether records can be created
	 * Defaults to true if not specified
	 */
	static getCanCreate(): boolean {
		return this.canCreate !== false; // Default to true if undefined
	}

	/**
	 * Get whether records can be edited
	 * Defaults to true if not specified
	 */
	static getCanEdit(): boolean {
		return this.canEdit !== false; // Default to true if undefined
	}

	/**
	 * Get whether records can be deleted
	 * Defaults to true if not specified
	 */
	static getCanDelete(): boolean {
		return this.canDelete !== false; // Default to true if undefined
	}

	/**
	 * Get whether records can be viewed
	 * Defaults to true if not specified
	 */
	static getCanView(): boolean {
		return this.canView !== false; // Default to true if undefined
	}

	/**
	 * Get searchable fields from table schema
	 * Only columns that have searchable: true will be included
	 * Note: Non-text columns (Toggle, Checkbox, Icon, Image, Video, Media) override
	 * searchable() to be a no-op, so they won't have searchable: true in their schema
	 */
	static getSearchableFields(): string[] {
		const table = this.table().toJSON();
		if (!table.columns) return [];

		const searchableFields: string[] = [];
		table.columns
			.filter((col: any) => col.searchable === true)
			.forEach((col: any) => {
				// If searchColumns is defined (via searchUsing), use those fields
				if (col.searchColumns && Array.isArray(col.searchColumns) && col.searchColumns.length > 0) {
					searchableFields.push(...col.searchColumns);
				} else {
					// Otherwise, use the column name itself
					searchableFields.push(col.name);
				}
			});

		// Remove duplicates
		return [...new Set(searchableFields)];
	}

	/**
	 * Check if resource has a form schema defined
	 */
	static hasForm(): boolean {
		const form = this.form().toJSON();
		return form.components && form.components.length > 0;
	}

	/**
	 * Check if resource has a table schema defined
	 */
	static hasTable(): boolean {
		const table = this.table().toJSON();
		return table.columns && table.columns.length > 0;
	}

	/**
	 * Check if resource has any actions defined
	 */
	static hasActions(): boolean {
		return Object.keys(this.actions()).length > 0;
	}

	/**
	 * Get serialized relations for API responses
	 * Converts RelationConfig to SerializedRelation with all metadata
	 */
	static getRelations(): SerializedRelation[] {
		const configs = this.relations();
		return configs.map(config => {
			return {
				name: config.name,
				type: 'hasMany',
				resourceSlug: config.resource.getSlug(),
				label: config.label || config.resource.getLabel(),
				pluralLabel: config.pluralLabel || config.resource.getPluralLabel(),
				icon: config.icon || config.resource.getIcon(),
				localKey: config.localKey,
				foreignKey: config.foreignKey,
				relatedKey: config.relatedKey || '_id',
				groupKey: config.group?.key,
				groupLabel: config.group?.label,
				groupIcon: config.group?.icon,
			};
		});
	}

	/**
	 * Check if resource has any relations defined
	 */
	static hasRelations(): boolean {
		return this.relations().length > 0;
	}

	/**
	 * Get the record title attribute configuration
	 */
	static getRecordTitleAttribute(): string | ((record: any) => string) | undefined {
		return this.recordTitleAttribute;
	}

	/**
	 * Compute the record title from a record
	 * @param record - The record data
	 * @returns The computed title string (may contain HTML)
	 */
	static computeRecordTitle(record: any): string | undefined {
		if (!this.recordTitleAttribute || !record) {
			return undefined;
		}

		if (typeof this.recordTitleAttribute === 'string') {
			// Field name - extract value from record
			return record[this.recordTitleAttribute] || undefined;
		} else if (typeof this.recordTitleAttribute === 'function') {
			// Function - execute with record
			try {
				return this.recordTitleAttribute(record);
			} catch (error) {
				console.error('Error computing record title:', error);
				return undefined;
			}
		}

		return undefined;
	}

	/**
	 * Get globally searchable attributes
	 * @returns Array of field names to search globally
	 */
	static getGloballySearchableAttributes(): string[] {
		return this.globallySearchableAttributes || [];
	}

	/**
	 * Get the featured image from a record
	 * @param record - The record data
	 * @returns The featured image object or undefined
	 */
	static getRecordFeaturedImage(record: any): any {
		if (!this.recordFeaturedImageAttribute || !record) {
			return undefined;
		}

		return record[this.recordFeaturedImageAttribute] || undefined;
	}
}

/**
 * Type for a BaseResource class (not instance)
 */
export type ResourceClass = typeof BaseResource & {
	new (): BaseResource;
	slug: string;
	entity: any;
	label?: string;
	pluralLabel?: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hidden?: boolean;
	excluded?: boolean;
	recordTitleAttribute?: string | ((record: any) => string);
	getRecordTitleAttribute?: () => string | ((record: any) => string) | undefined;
	computeRecordTitle?: (record: any) => string | undefined;
	globallySearchableAttributes?: string[];
	recordFeaturedImageAttribute?: string;
	getGloballySearchableAttributes?: () => string[];
	getRecordFeaturedImage?: (record: any) => any;
	relations?: () => RelationConfig[];
	getRelations?: () => SerializedRelation[];
	hasRelations?: () => boolean;
	hooks?: () => ResourceHooks;
};
