import { SerializedForm } from '../formbuilder/types';
import { SerializedTable, PopulateOption, GroupingConfig } from '../tablebuilder/types';
import type { QueryBuilderRule } from '../tablebuilder/table/filters/QueryBuilderFilter';
import { DataAdapter } from '../adapters/database/DataAdapter';
import type { BaseResource } from '../BaseResource';
import { RequestContext } from '../RequestContext';

/**
 * Configuration for creating a Resource
 */
export interface ResourceConfig {
	adapter: DataAdapter;
	formSchema: SerializedForm;
	tableSchema: SerializedTable;
	hooks?: ResourceHooks;
	resourceClass: typeof BaseResource;
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
	public field?: string;
	public rule?: string;

	constructor(message: string, field?: string, rule?: string) {
		super(message);
		this.name = 'ValidationError';
		this.field = field;
		this.rule = rule;
	}
}

/**
 * Parameters for list/query operations
 */
export interface QueryParams {
	page?: number;
	perPage?: number;
	search?: string;
	sort?: string;
	sortDirection?: 'asc' | 'desc';
	filters?: Record<string, any>;
	queryBuilders?: Record<string, QueryBuilderRule[]>;
	populate?: PopulateOption[];
	/** Grouping configuration for aggregated queries */
	grouping?: GroupingConfig;
}

/**
 * Parameters for querying related records
 */
export interface RelationQueryParams extends QueryParams {
	/** The ID of the parent record */
	parentId: any;
	/** The relation configuration */
	relation: SerializedRelation;
}

export type { QueryBuilderRule };

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
 * Result structure for list operations
 */
export interface QueryResult {
	data: any[];
	pagination: PaginationMeta;
}

/**
 * Result for create operation
 */
export interface CreateResult {
	data: any;
	message?: string;
}

/**
 * Result for update operation
 */
export interface UpdateResult {
	data: any;
	message?: string;
}

/**
 * Result for delete operation
 */
export interface DeleteResult {
	deleted: any[];
	message?: string;
}

/**
 * Relation types
 */
export type RelationType = 'hasMany';

/**
 * Configuration for defining a relation
 */
export interface RelationConfig {
	name: string;
	resource: any; // ResourceClass

	// Optional overrides
	label?: string;
	pluralLabel?: string;
	icon?: string;

	// Optional grouping for UI (e.g., group followers/following)
	group?: {
		key: string;
		label: string;
		icon?: string;
	};

	// Relation keys
	localKey: string; // e.g., '_id' on User
	foreignKey: string; // e.g., 'userId' on Post
	relatedKey?: string; // e.g., '_id' on Post (optional, defaults to '_id')
}

/**
 * Serialized relation for API responses
 */
export interface SerializedRelation {
	name: string;
	type: RelationType;
	resourceSlug: string;
	resourceApiUrl?: string; // Full API URL for the related resource (e.g., 'http://localhost:3001/kratosjs/api/users')
	label: string;
	pluralLabel: string;
	icon?: string;

	// Optional grouping metadata
	groupKey?: string;
	groupLabel?: string;
	groupIcon?: string;

	// Keys for querying
	localKey: string;
	foreignKey: string;
	relatedKey: string;
}

/**
 * Hook context with structured input/output sections
 */
export interface HookContext {
	/** The resource class being operated on */
	resourceClass: typeof BaseResource;
	/** The data adapter instance */
	adapter: DataAdapter;
	/** The current operation type */
	operation: 'create' | 'update' | 'delete' | 'list' | 'listRelated' | 'findById' | 'action';

	/**
	 * Input section - data coming into the operation
	 * Hooks can modify these values in before* hooks
	 */
	input: {
		/** Payload data for create/update (always array for consistency) */
		data?: any[];
		/** Target record IDs for update/delete/findById (always array) */
		ids?: string[];
		/** Query parameters for list operations */
		params?: QueryParams;
	};

	/**
	 * Output section - results after operation
	 * Populated in after* hooks, can be modified
	 */
	output: {
		/** Resulting records (created, updated, found, or listed) */
		records: any[];
		/** Previous state of records (for update operations) */
		previous?: any[];
		/** Result returned by a custom action handler (for the 'action' operation) */
		action?: any;
	};

	/**
	 * Authenticated user (if available)
	 * Set automatically when operations are called from route handlers
	 */
	user?: any;

	/**
	 * HTTP context (optional, when called from route handlers)
	 */
	http?: {
		/** Express request object */
		request: any;
		/** Express response object */
		response: any;
	};

	/**
	 * Custom action metadata (optional, set when running a custom/bulk/header action)
	 * Populated for the 'action' operation so beforeAction/afterAction hooks can
	 * inspect which action ran and its submitted form payload.
	 */
	action?: {
		/** The registered action name being executed */
		name: string;
		/** Form data submitted with the action (if any) */
		formData?: any;
	};

	/**
	 * Error object (optional, set when onError hooks are called)
	 */
	error?: any;

	/**
	 * Request context (if available)
	 * Contains user, query, body, headers, resolveMediaUrl helper, etc.
	 */
	context?: RequestContext;
}

/**
 * Hook handler function type
 * Can modify context.input (before*) or context.output (after*)
 */
export type HookHandler = (ctx: HookContext) => Promise<void> | void;

/**
 * Resource hooks configuration
 */
export interface ResourceHooks {
	beforeCreate?: HookHandler[];
	afterCreate?: HookHandler[];
	beforeUpdate?: HookHandler[];
	afterUpdate?: HookHandler[];
	beforeDelete?: HookHandler[];
	afterDelete?: HookHandler[];
	beforeList?: HookHandler[];
	afterList?: HookHandler[];
	beforeListRelated?: HookHandler[];
	afterListRelated?: HookHandler[];
	beforeFindById?: HookHandler[];
	afterFindById?: HookHandler[];
	/** Run around schema validation in create/update (input.data holds the data to validate) */
	beforeValidate?: HookHandler[];
	afterValidate?: HookHandler[];
	/** Run around custom/bulk/header action execution (context.action describes the action) */
	beforeAction?: HookHandler[];
	afterAction?: HookHandler[];
	onError?: HookHandler[]; // Generic error handler
}
