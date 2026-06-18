import { SerializedForm } from './formbuilder/types';
import { SerializedTable } from './tablebuilder/types';
import { DataAdapter } from './adapters/database/DataAdapter';
import { SchemaValidator } from './validators/SchemaValidator';
import { TableValidator } from './validators/TableValidator';
import {
	ResourceConfig,
	QueryParams,
	QueryResult,
	RelationQueryParams,
	CreateResult,
	UpdateResult,
	DeleteResult,
	ResourceHooks,
	HookContext,
} from './resource/types';
import type { BaseResource } from './BaseResource';
import type { RequestContext } from './RequestContext';
import { getRequestContext } from './RequestContextStorage';

/**
 * Unified Resource class for managing data operations
 * Handles validation, filtering, and CRUD operations for both forms and tables
 */
export class Resource {
	private adapter: DataAdapter;
	private formSchema: SerializedForm;
	private tableSchema: SerializedTable;
	private hooks?: ResourceHooks;
	private resourceClass: typeof BaseResource;
	private _context?: RequestContext;

	/**
	 * Create a new Resource
	 * @param config - Resource configuration
	 */
	constructor(config: ResourceConfig) {
		this.adapter = config.adapter;
		this.formSchema = config.formSchema;
		this.tableSchema = config.tableSchema;
		this.hooks = config.hooks;
		this.resourceClass = config.resourceClass;
	}

	/**
	 * Get the request context (user, query, body, headers, resolveMediaUrl, etc.).
	 * Returns instance context when set, otherwise the current request context from storage.
	 * @returns The request context if available
	 */
	getContext(): RequestContext | undefined {
		return this._context ?? getRequestContext();
	}

	/**
	 * Execute hooks for a given event.
	 * Errors propagate to the caller; onError handling is owned by runOperation()
	 * so it fires exactly once per failure (whether thrown by a hook or the adapter).
	 * @param event - The hook event name
	 * @param context - The hook context
	 */
	private async executeHooks(event: keyof ResourceHooks, context: HookContext): Promise<void> {
		const handlers = this.hooks?.[event];
		if (!handlers?.length) return;

		for (const handler of handlers) {
			await handler(context);
		}
	}

	/**
	 * Run an operation's work inside the shared hook error boundary.
	 * On any throw (from a before/after hook or the adapter) the onError hooks
	 * run once and the error is rethrown.
	 * @param context - The hook context for the operation
	 * @param work - The operation body (before hook → adapter → after hook)
	 */
	private async runOperation<T>(context: HookContext, work: (ctx: HookContext) => Promise<T>): Promise<T> {
		try {
			return await work(context);
		} catch (error) {
			await this.executeErrorHooks({ ...context, error } as HookContext);
			throw error;
		}
	}

	/**
	 * Build a base hook context for an operation.
	 */
	private buildContext(
		operation: HookContext['operation'],
		input: HookContext['input'],
		extra: Partial<HookContext> = {},
	): HookContext {
		return {
			resourceClass: this.resourceClass!,
			adapter: this.adapter,
			operation,
			input,
			output: { records: [] },
			user: this.getContext()?.user,
			context: this.getContext(),
			...extra,
		};
	}

	/**
	 * Execute onError hooks
	 * @param context - The hook context with error
	 */
	private async executeErrorHooks(context: HookContext): Promise<void> {
		const handlers = this.hooks?.onError;
		if (!handlers?.length) return;

		for (const handler of handlers) {
			try {
				await handler(context);
			} catch (error) {
				// If onError hook itself throws, log it but don't throw again to avoid infinite loops
				console.error('Error in onError hook:', error);
			}
		}
	}

	/**
	 * Create a new record (form operation)
	 * Validates data against form schema before creating
	 * @param data - The data to create
	 * @param user - Optional authenticated user
	 */
	async create(data: any): Promise<CreateResult> {
		const context = this.buildContext('create', { data: [data] });

		return this.runOperation(context, async ctx => {
			// beforeCreate - can modify input.data
			await this.executeHooks('beforeCreate', ctx);

			// Use potentially modified data
			let validatedData = ctx.input.data?.[0] ?? data;

			// Validate with form schema if available, wrapped in validate hooks
			if (this.formSchema) {
				await this.executeHooks('beforeValidate', ctx);
				validatedData = SchemaValidator.validateCreate(this.formSchema, ctx.input.data?.[0] ?? validatedData);
				ctx.input.data = [validatedData];
				await this.executeHooks('afterValidate', ctx);
				validatedData = ctx.input.data?.[0] ?? validatedData;
			}

			// Create record using adapter
			let result = await this.adapter.create(validatedData);

			// Filter fields if form schema is available
			if (this.formSchema) {
				result = SchemaValidator.filterFields(this.formSchema, result, ['id', '_id']);
			}

			// afterCreate - populate output.records
			ctx.output.records = [result];
			await this.executeHooks('afterCreate', ctx);

			return {
				data: ctx.output.records[0],
				message: 'Record created successfully',
			};
		});
	}

	/**
	 * Update an existing record (form or table operation)
	 * Validates data against form or table schema before updating
	 * @param id - The record ID to update
	 * @param data - The data to update
	 * @param user - Optional authenticated user
	 */
	async update(id: any, data: any): Promise<UpdateResult> {
		const context = this.buildContext('update', { data: [data], ids: [String(id)] });

		return this.runOperation(context, async ctx => {
			// Fetch previous record for hooks
			const previousRecord = await this.adapter.findById(id);
			ctx.output.previous = previousRecord ? [previousRecord] : [];

			// beforeUpdate - can modify input.data
			await this.executeHooks('beforeUpdate', ctx);

			// Use potentially modified data
			let validatedData = ctx.input.data?.[0] ?? data;

			// Validate with form or table schema, wrapped in validate hooks
			if (this.formSchema || this.tableSchema) {
				await this.executeHooks('beforeValidate', ctx);
				const toValidate = ctx.input.data?.[0] ?? validatedData;
				if (this.formSchema) {
					validatedData = SchemaValidator.validateUpdate(this.formSchema, toValidate);
				} else if (this.tableSchema) {
					// For table updates, ensure only editable columns are updated
					validatedData = TableValidator.validateEditableColumns(this.tableSchema, toValidate);
					TableValidator.validateColumnValues(this.tableSchema, validatedData);
				}
				ctx.input.data = [validatedData];
				await this.executeHooks('afterValidate', ctx);
				validatedData = ctx.input.data?.[0] ?? validatedData;
			}

			// Update record using adapter
			let result = await this.adapter.update(id, validatedData);

			// Filter fields if form schema is available
			if (this.formSchema) {
				result = SchemaValidator.filterFields(this.formSchema, result, ['id', '_id']);
			}

			// afterUpdate - populate output.records
			ctx.output.records = [result];
			await this.executeHooks('afterUpdate', ctx);

			return {
				data: ctx.output.records[0],
				message: 'Record updated successfully',
			};
		});
	}

	/**
	 * Find a single record by ID
	 * @param id - The record ID to find
	 * @param user - Optional authenticated user
	 */
	async findById(id: any): Promise<any> {
		const context = this.buildContext('findById', { ids: [String(id)] });

		return this.runOperation(context, async ctx => {
			// beforeFindById - can modify input.ids
			await this.executeHooks('beforeFindById', ctx);

			// Use potentially modified id
			const recordId = ctx.input.ids?.[0] || id;

			const result = await this.adapter.findById(recordId);

			if (!result) {
				return null;
			}

			// Filter fields if form schema is available
			let filteredResult = result;
			if (this.formSchema) {
				filteredResult = SchemaValidator.filterFields(this.formSchema, result, ['id', '_id']);
			}

			// afterFindById - populate output.records
			ctx.output.records = [filteredResult];
			await this.executeHooks('afterFindById', ctx);

			return ctx.output.records[0];
		});
	}

	/**
	 * List records with filtering, sorting, and pagination (table operation)
	 * Filters columns based on table schema
	 * @param params - Query parameters
	 * @param user - Optional authenticated user
	 */
	async list(params: QueryParams): Promise<QueryResult> {
		const context = this.buildContext('list', { params });

		return this.runOperation(context, async ctx => {
			// beforeList - can modify input.params
			await this.executeHooks('beforeList', ctx);

			// Use potentially modified params
			const queryParams = ctx.input.params || params;

			// Get data from adapter
			const result = await this.adapter.list(queryParams);

			// Expose adapter and list params on request context for widgets/hooks
			const requestContext = getRequestContext();
			if (requestContext) {
				requestContext.databaseAdapter = this.adapter;
				requestContext.listParams = queryParams;
			}

			// Filter columns if table schema is available
			if (this.tableSchema && result.data.length > 0) {
				result.data = TableValidator.filterColumns(this.tableSchema, result.data);
			}

			// afterList - populate output.records
			ctx.output.records = result.data;
			await this.executeHooks('afterList', ctx);

			return {
				data: ctx.output.records,
				pagination: result.pagination,
			};
		});
	}

	/**
	 * List related records (for hasMany relations)
	 * Same flow as list(): hooks run, listParams/databaseAdapter set on context
	 * @param params - Relation query parameters (parentId, relation, page, perPage, filters, etc.)
	 * @returns Paginated related records
	 */
	async listRelated(params: RelationQueryParams): Promise<QueryResult> {
		const context = this.buildContext('listRelated', { params });

		return this.runOperation(context, async ctx => {
			await this.executeHooks('beforeListRelated', ctx);

			const queryParams = (ctx.input.params || params) as RelationQueryParams;

			const result = await this.adapter.listRelated(queryParams);

			// Expose adapter and list params on request context (same as list)
			const requestContext = getRequestContext();
			if (requestContext) {
				requestContext.databaseAdapter = this.adapter;
				requestContext.listParams = queryParams;
			}

			if (this.tableSchema && result.data.length > 0) {
				result.data = TableValidator.filterColumns(this.tableSchema, result.data);
			}

			ctx.output.records = result.data;
			await this.executeHooks('afterListRelated', ctx);

			return {
				data: ctx.output.records,
				pagination: result.pagination,
			};
		});
	}

	/**
	 * Delete one or more records (table operation)
	 * @param ids - Array of record IDs to delete
	 * @param user - Optional authenticated user
	 */
	async delete(ids: any[]): Promise<DeleteResult> {
		const context = this.buildContext('delete', { ids: ids.map(id => String(id)) });

		return this.runOperation(context, async ctx => {
			// beforeDelete - can prevent deletion by throwing
			await this.executeHooks('beforeDelete', ctx);

			// Delete records using adapter
			const result = await this.adapter.delete(ids);

			// afterDelete - populate output.records with deleted records
			ctx.output.records = result.deleted;
			await this.executeHooks('afterDelete', ctx);

			return {
				deleted: ctx.output.records,
				message: `${ctx.output.records.length} record(s) deleted successfully`,
			};
		});
	}

	/**
	 * Run a custom/bulk/header action through the hook pipeline.
	 * Fires beforeAction → handler → afterAction, and onError on failure, so
	 * actions participate in the same lifecycle as CRUD operations (logging, etc.).
	 * @param name - The registered action name
	 * @param handler - The action handler to execute
	 * @param handlerData - Data passed to the handler ({ records, formData })
	 * @returns The handler's result (afterAction hooks may modify ctx.output.action)
	 */
	async runAction<T = any>(
		name: string,
		handler: (data: { records: any[]; formData?: any }) => Promise<T> | T,
		handlerData: { records: any[]; formData?: any },
	): Promise<T> {
		const records = handlerData.records ?? [];
		const context = this.buildContext(
			'action',
			{
				data: records,
				ids: records.map(r => String(r?.id ?? r?._id ?? '')).filter(Boolean),
			},
			{ action: { name, formData: handlerData.formData } },
		);

		return this.runOperation(context, async ctx => {
			// beforeAction - can inspect/modify records or throw to abort
			await this.executeHooks('beforeAction', ctx);

			// Execute the action handler
			const result = await handler(handlerData);

			// afterAction - expose handler result on the context for hooks (e.g. logging)
			ctx.output.action = result;
			await this.executeHooks('afterAction', ctx);

			return result;
		});
	}

	/**
	 * Set or update the form schema
	 */
	setFormSchema(schema: SerializedForm): this {
		this.formSchema = schema;
		return this;
	}

	/**
	 * Set or update the table schema
	 */
	setTableSchema(schema: SerializedTable): this {
		this.tableSchema = schema;
		return this;
	}

	/**
	 * Get the underlying data adapter
	 */
	getAdapter(): DataAdapter {
		return this.adapter;
	}

	/**
	 * Get the form schema
	 */
	getFormSchema(): SerializedForm {
		return this.formSchema;
	}

	/**
	 * Get the table schema
	 */
	getTableSchema(): SerializedTable {
		return this.tableSchema;
	}
}
