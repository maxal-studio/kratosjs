import { QueryBuilderRule } from '../filters/QueryBuilderFilter';

/**
 * Tab definition for quick filters in tables
 */
export interface TabDefinition {
	/** Unique identifier (e.g., 'images', 'videos') */
	key: string;
	/** Display name (e.g., 'Images', 'Videos') */
	label: string;
	/** Optional Lucide icon name */
	icon?: string;
	/** Filter conditions using query builder rules */
	queryBuilder: QueryBuilderRule[];
	/** If true, this tab is selected by default when the table loads */
	default?: boolean;
}
