import { apiPost } from './http';

/**
 * Query parameters for table API requests
 */
export interface QueryParams {
	page?: number;
	perPage?: number;
	search?: string;
	sort?: string;
	sortDirection?: 'asc' | 'desc';
	filters?: Record<string, any>;
	queryBuilders?: Record<string, any[]>;
}

/**
 * Standard pagination metadata
 */
export interface PaginationMeta {
	/** Current page number (1-indexed) */
	page: number;
	/** Number of items per page */
	limit: number;
	/** Total number of items across all pages */
	total: number;
	/** Total number of pages */
	pages: number;
	/** Whether there's a next page */
	hasNext: boolean;
	/** Whether there's a previous page */
	hasPrev: boolean;
}

/**
 * Result structure for table API responses
 */
export interface QueryResult {
	data: any[];
	pagination: PaginationMeta;
	widgets?: Record<string, any>;
}

/**
 * API client for communicating with the table backend
 */
export class TableApiClient {
	private baseUrl: string;
	private apiBaseUrl: string;
	private fetchPath: string;

	/**
	 * @param apiBaseUrl - Base URL for the panel API (used for token refresh)
	 * @param baseUrl - Base URL of the resource endpoint (e.g. 'http://localhost:3001/api/users')
	 * @param fetchPath - Path appended for list queries ('/list' for resources, '' for custom endpoints)
	 */
	constructor(apiBaseUrl: string, baseUrl: string, fetchPath: string = '') {
		this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
		this.fetchPath = fetchPath;
		this.apiBaseUrl = apiBaseUrl;
	}

	/**
	 * Fetch table data with filtering, sorting, and pagination
	 */
	async fetchData(params: QueryParams): Promise<QueryResult> {
		return apiPost<QueryResult>(this.baseUrl + this.fetchPath, params, this.apiBaseUrl);
	}

	/**
	 * Update a single record. Unwraps the `{ data, metadata }` envelope.
	 */
	async updateRecord(id: any, data: any): Promise<any> {
		const result = await apiPost<any>(`${this.baseUrl}/update/${id}`, data, this.apiBaseUrl);
		return result?.data || result;
	}

	/**
	 * Delete records (bulk or single).
	 * Returns the full response body (including metadata e.g. refreshBadges) so callers can react to it.
	 */
	async deleteRecords(
		ids: any[],
	): Promise<{ deleted?: any[]; metadata?: { refreshBadges?: boolean }; [key: string]: any }> {
		return apiPost(`${this.baseUrl}/bulk-delete`, { ids }, this.apiBaseUrl);
	}

	/**
	 * Bulk delete records (alias for deleteRecords)
	 */
	async bulkDelete(
		ids: any[],
	): Promise<{ deleted?: any[]; metadata?: { refreshBadges?: boolean }; [key: string]: any }> {
		return this.deleteRecords(ids);
	}

	getBaseUrl(): string {
		return this.baseUrl;
	}

	getFetchPath(): string {
		return this.fetchPath;
	}

	getApiBaseUrl(): string {
		return this.apiBaseUrl;
	}
}
