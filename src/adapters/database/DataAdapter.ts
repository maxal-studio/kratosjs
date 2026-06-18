import { QueryParams, QueryResult, RelationQueryParams } from '../../resource/types';

/**
 * Abstract base class for database adapters
 * The built-in implementation is MikroOrmAdapter, which supports both SQL
 * (MySQL, MariaDB, PostgreSQL, SQLite) and NoSQL (MongoDB) via MikroORM drivers.
 */
export abstract class DataAdapter {
	/**
	 * Create a new record
	 * @param data - The data to create
	 * @returns The created record
	 */
	abstract create(data: any): Promise<any>;

	/**
	 * Find a single record by ID
	 * @param id - The record ID
	 * @returns The record or null if not found
	 */
	abstract findById(id: any): Promise<any | null>;

	/**
	 * Find multiple records by IDs (batch operation)
	 * @param ids - Array of record IDs
	 * @returns Array of records (in same order as IDs where possible)
	 */
	abstract findByIds(ids: any[]): Promise<any[]>;

	/**
	 * Update a single record
	 * @param id - The record ID
	 * @param data - The data to update
	 * @returns The updated record
	 */
	abstract update(id: any, data: any): Promise<any>;

	/**
	 * Delete one or more records
	 * @param ids - Array of record IDs to delete
	 * @returns Object containing deleted IDs
	 */
	abstract delete(ids: any[]): Promise<{ deleted: any[] }>;

	/**
	 * List records with filtering, sorting, and pagination
	 * @param params - Query parameters
	 * @returns Paginated query result
	 */
	abstract list(params: QueryParams): Promise<QueryResult>;

	/**
	 * Builds a database-specific query/filter from QueryParams for use in widgets/hooks.
	 * This allows widgets to build queries with the same filters as the current list view.
	 *
	 * For MikroOrmAdapter this returns a MikroORM `where` object usable with
	 * em.find()/em.count() on both SQL and MongoDB drivers.
	 *
	 * @param params - Generic query parameters (filters, search, queryBuilders, etc.)
	 * @returns Database-specific filter/query object
	 *
	 * @example
	 * // In a widget:
	 * const ctx = getRequestContext();
	 * const where = await ctx.databaseAdapter?.buildFiltersQuery(ctx.listParams);
	 * const count = await em.count(entity, { ...where, active: true });
	 */
	abstract buildFiltersQuery(params: QueryParams): Promise<any>;

	/**
	 * Query related records based on relation configuration
	 * @param params - Relation query parameters
	 * @returns Paginated query result
	 */
	abstract listRelated(params: RelationQueryParams): Promise<QueryResult>;

	/**
	 * Global search across specified fields with OR logic (case-insensitive)
	 * @param query - Search query string
	 * @param searchableFields - Array of field names to search
	 * @param limit - Maximum number of results to return (default: 5)
	 * @returns Array of matching records
	 */
	abstract globalSearch(query: string, searchableFields: string[], limit?: number): Promise<any[]>;
}
