import { EntityManager, EntityMetadata, EntityName, MikroORM, Utils, raw, wrap } from '@mikro-orm/core';
import { DataAdapter } from './DataAdapter';
import { QueryParams, QueryResult, RelationQueryParams, QueryBuilderRule } from '../../resource/types';
import type {
	CountMetric,
	SumMetric,
	AvgMetric,
	MinMetric,
	MaxMetric,
	RatioMetric,
	FirstMetric,
	LastMetric,
	CountDistinctMetric,
	PopulateOption,
	GroupingConfig,
} from '../../tablebuilder/types';

/** Escape special regex characters for safe use inside a RegExp */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Escape special LIKE characters (%, _, \) for safe use inside a LIKE pattern */
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

/** Numeric-ish property types used to coerce string ids to numbers */
const NUMERIC_TYPES = new Set([
	'number',
	'integer',
	'int',
	'smallint',
	'mediumint',
	'bigint',
	'tinyint',
	'float',
	'double',
	'decimal',
]);

/**
 * Database adapter backed by MikroORM.
 * Works with both SQL drivers (MySQL, MariaDB, PostgreSQL, SQLite) and the MongoDB driver,
 * branching on the platform only where backends genuinely differ
 * (case-insensitive search and grouped/aggregated queries).
 */
export class MikroOrmAdapter extends DataAdapter {
	private orm: MikroORM;
	private entity: EntityName<any>;
	private entityName: string;
	private searchableFields: string[];

	/**
	 * @param orm - The MikroORM instance (owned by the Panel)
	 * @param entity - The entity (EntitySchema or class) to operate on
	 * @param searchableFields - Fields to search when a search query is provided
	 */
	constructor(orm: MikroORM, entity: EntityName<any>, searchableFields: string[] = []) {
		super();
		this.orm = orm;
		// v7 no longer accepts string entity references in EM methods, so keep the
		// actual entity reference and derive the name only for metadata lookups/messages.
		this.entity = entity;
		this.entityName = Utils.className(entity);
		this.searchableFields = searchableFields;
	}

	/**
	 * Get the context-aware EntityManager.
	 * When called inside a request handled by the Panel, this resolves to the
	 * request-scoped fork created by MikroORM's RequestContext middleware.
	 */
	getEm(): EntityManager {
		return this.orm.em;
	}

	/**
	 * Get the underlying MikroORM instance
	 */
	getOrm(): MikroORM {
		return this.orm;
	}

	/**
	 * Get the entity name this adapter operates on
	 */
	getEntityName(): string {
		return this.entityName;
	}

	private get em(): EntityManager {
		return this.orm.em;
	}

	private get meta(): EntityMetadata {
		return this.orm.getMetadata().get(this.entity);
	}

	private get pk(): string {
		return this.meta.primaryKeys[0];
	}

	private isMongo(): boolean {
		return this.orm.config.getDriver().constructor.name === 'MongoDriver';
	}

	/**
	 * Map an external field name to the entity property name.
	 * Handles `_id`/`id` aliases for both SQL (pk `id`) and Mongo (pk `_id`).
	 */
	private mapField(field: string, meta: EntityMetadata = this.meta): string {
		const prop = meta.properties[field];
		if (prop) {
			// Serialized PK alias (Mongo `id` -> `_id`)
			if ((prop as any).serializedPrimaryKey) return meta.primaryKeys[0];
			return field;
		}
		if (field === '_id' || field === 'id') return meta.primaryKeys[0];
		return field;
	}

	/**
	 * Coerce string ids to numbers when the primary key is numeric (SQL auto-increment)
	 */
	private coerceId(id: any, meta: EntityMetadata = this.meta): any {
		const prop = meta.properties[meta.primaryKeys[0]];
		const type = String(prop?.type ?? '').toLowerCase();
		const runtimeType = String((prop as any)?.runtimeType ?? '').toLowerCase();
		if (NUMERIC_TYPES.has(type) || runtimeType === 'number') {
			const n = Number(id);
			return Number.isNaN(n) ? id : n;
		}
		return id;
	}

	/**
	 * Serialize an entity to a plain object, aliasing `id`/`_id` so both keys
	 * are always present regardless of the underlying driver.
	 */
	private serialize(entity: any): any {
		const obj = wrap(entity).toObject();
		return this.aliasIds(obj);
	}

	private aliasIds(value: any, depth = 0): any {
		if (value == null || depth > 4) return value;
		if (Array.isArray(value)) return value.map(v => this.aliasIds(v, depth));
		if (value instanceof Date) return value;
		if (typeof value === 'object') {
			if (value.id !== undefined && value._id === undefined) {
				value._id = value.id;
			} else if (value._id !== undefined && value.id === undefined) {
				value.id = value._id;
			}
			for (const [k, v] of Object.entries(value)) {
				if (v && typeof v === 'object' && !(v instanceof Date)) {
					value[k] = this.aliasIds(v, depth + 1);
				}
			}
		}
		return value;
	}

	/**
	 * Keep only properties known to the entity (mapping `_id`/`id` aliases to the pk)
	 */
	private pickKnownProps(data: Record<string, any>): Record<string, any> {
		const result: Record<string, any> = {};
		for (const [key, value] of Object.entries(data)) {
			if (value === undefined) continue;
			const mapped = this.mapField(key);
			if (this.meta.properties[mapped]) {
				result[mapped] = value;
			}
		}
		return result;
	}

	/**
	 * Create a new record
	 */
	async create(data: any): Promise<any> {
		const payload = this.pickKnownProps(data);
		const entity = this.em.create(this.entity, payload as never);
		this.em.persist(entity);
		await this.em.flush();
		return this.serialize(entity);
	}

	/**
	 * Find a single record by ID
	 */
	async findById(id: any): Promise<any | null> {
		try {
			const entity = await this.em.findOne(this.entity, {
				[this.pk]: this.coerceId(id),
			} as any);
			return entity ? this.serialize(entity) : null;
		} catch {
			// Invalid id format (e.g. malformed ObjectId)
			return null;
		}
	}

	/**
	 * Find multiple records by IDs (batch operation)
	 * Returns records in the same order as the input IDs where possible
	 */
	async findByIds(ids: any[]): Promise<any[]> {
		try {
			const coerced = ids.map(id => this.coerceId(id));
			const entities = await this.em.find(this.entity, {
				[this.pk]: { $in: coerced },
			} as any);
			const map = new Map<string, any>();
			for (const entity of entities) {
				map.set(String((entity as any)[this.pk]), this.serialize(entity));
			}
			return ids.map(id => map.get(String(id))).filter((doc): doc is any => doc !== undefined);
		} catch (error) {
			console.error('Error in findByIds:', error);
			return [];
		}
	}

	/**
	 * Update a single record
	 */
	async update(id: any, data: any): Promise<any> {
		const entity = await this.em.findOne(this.entity, {
			[this.pk]: this.coerceId(id),
		} as any);

		if (!entity) {
			throw new Error(`Record with id ${id} not found`);
		}

		const payload = this.pickKnownProps(data);
		delete payload[this.pk];

		if (Object.keys(payload).length > 0) {
			this.em.assign(entity, payload as never);
			await this.em.flush();
		}

		return this.serialize(entity);
	}

	/**
	 * Delete one or more records
	 */
	async delete(ids: any[]): Promise<{ deleted: any[] }> {
		const coerced = ids.map(id => this.coerceId(id));
		await this.em.nativeDelete(this.entity, { [this.pk]: { $in: coerced } } as any);
		return { deleted: ids };
	}

	// ============================================================================
	// Where-clause building
	// ============================================================================

	/** Case-insensitive "contains" condition for the current platform */
	private containsCondition(value: string): any {
		if (this.isMongo()) {
			return new RegExp(escapeRegex(String(value)), 'i');
		}
		return { $like: `%${escapeLike(String(value))}%` };
	}

	/** Case-insensitive "starts with" condition for the current platform */
	private startsWithCondition(value: string): any {
		if (this.isMongo()) {
			return new RegExp(`^${escapeRegex(String(value))}`, 'i');
		}
		return { $like: `${escapeLike(String(value))}%` };
	}

	/** Case-insensitive "ends with" condition for the current platform */
	private endsWithCondition(value: string): any {
		if (this.isMongo()) {
			return new RegExp(`${escapeRegex(String(value))}$`, 'i');
		}
		return { $like: `%${escapeLike(String(value))}` };
	}

	/**
	 * Build a where object from KratosJs filters
	 */
	private buildInternalFiltersQuery(filters: Record<string, any>): any {
		const query: any = {};

		for (const [rawKey, value] of Object.entries(filters)) {
			if (value === undefined || value === null || value === '') {
				continue;
			}

			// Relation filter keys (a->b) are resolved later
			const key = rawKey.includes('->') ? rawKey : this.mapField(rawKey);

			// Date range filters ({ from, to })
			if (
				typeof value === 'object' &&
				!Array.isArray(value) &&
				!(value instanceof Date) &&
				(value.from !== undefined || value.to !== undefined)
			) {
				const range: any = {};
				if (value.from) {
					range.$gte = new Date(value.from);
				}
				if (value.to) {
					const toDate = new Date(value.to);
					toDate.setHours(23, 59, 59, 999);
					range.$lte = toDate;
				}
				if (Object.keys(range).length > 0) {
					query[key] = range;
				}
			}
			// Arrays (multi-select filters)
			else if (Array.isArray(value)) {
				if (value.length > 0) {
					query[key] = { $in: value };
				}
			}
			// Scalars (booleans, strings, numbers)
			else {
				query[key] = value;
			}
		}

		return query;
	}

	/**
	 * Build search conditions across searchable fields.
	 * Space-separated terms are AND'ed; each term must match at least one field.
	 */
	private buildInternalSearchQuery(search: string, fields: string[]): any {
		if (!search || fields.length === 0) {
			return {};
		}

		const terms = search
			.trim()
			.split(/\s+/)
			.filter(term => term.length > 0);

		if (terms.length === 0) {
			return {};
		}

		const termCondition = (term: string) => ({
			$or: fields.map(field => ({ [this.mapField(field)]: this.containsCondition(term) })),
		});

		if (terms.length === 1) {
			return termCondition(terms[0]);
		}

		return { $and: terms.map(termCondition) };
	}

	/**
	 * Build where conditions from query builder rules
	 * Supports nested groups and OR conditions
	 */
	private buildInternalQueryBuilderQuery(
		input: Record<string, QueryBuilderRule[]> | QueryBuilderRule[] | undefined,
	): any {
		if (!input) {
			return {};
		}

		let rules: QueryBuilderRule[];
		if (Array.isArray(input)) {
			rules = input;
		} else {
			rules = [];
			for (const filterRules of Object.values(input)) {
				if (Array.isArray(filterRules) && filterRules.length > 0) {
					rules.push(...filterRules);
				}
			}
		}

		if (rules.length === 0) {
			return {};
		}

		const conditions: any[] = [];

		for (const rule of rules) {
			const { type, dataType, data } = rule;

			// OR groups
			if (type === 'or' && data.groups) {
				const orConditions: any[] = [];
				for (const group of data.groups) {
					const groupQuery = this.buildInternalQueryBuilderQuery(group.rules);
					if (Object.keys(groupQuery).length > 0) {
						orConditions.push(groupQuery);
					}
				}
				if (orConditions.length > 0) {
					conditions.push({ $or: orConditions });
				}
				continue;
			}

			const { operator, settings } = data;
			if (!settings) continue;

			const rawField = settings.field || (type && type !== 'or' ? type : undefined);
			if (!rawField) {
				console.warn('QueryBuilderRule missing field in settings.field');
				continue;
			}
			const field = rawField.includes('->') ? rawField : this.mapField(rawField);
			let value = settings.value;

			const needsArrayValue = ['between', 'notBetween', 'not_between', 'in', 'notIn', 'not_in'].includes(
				operator || '',
			);

			if (!needsArrayValue && value !== null && value !== undefined && value !== '') {
				switch (dataType) {
					case 'number':
						value = Number(value);
						if (isNaN(value)) {
							console.warn(`Invalid number value for field ${field}: ${settings.value}`);
							continue;
						}
						break;
					case 'date':
						// Date values are handled per-operator below
						break;
					case 'boolean':
						if (typeof value === 'string') {
							value = value === 'true' || value === '1';
						}
						value = Boolean(value);
						break;
					default:
						break;
				}
			}

			switch (operator) {
				case 'equals':
				case '=':
					if (dataType === 'date' && value) {
						const dateValue = new Date(value);
						dateValue.setHours(0, 0, 0, 0);
						const endOfDay = new Date(dateValue);
						endOfDay.setHours(23, 59, 59, 999);
						conditions.push({ [field]: { $gte: dateValue, $lte: endOfDay } });
					} else {
						conditions.push({ [field]: value });
					}
					break;

				case 'notEquals':
				case 'not_equals':
				case '!=':
					if (dataType === 'date' && value) {
						const dateValue = new Date(value);
						dateValue.setHours(0, 0, 0, 0);
						const endOfDay = new Date(dateValue);
						endOfDay.setHours(23, 59, 59, 999);
						conditions.push({
							$or: [{ [field]: { $lt: dateValue } }, { [field]: { $gt: endOfDay } }],
						});
					} else {
						conditions.push({ [field]: { $ne: value } });
					}
					break;

				case 'contains':
					if (value) {
						conditions.push({ [field]: this.containsCondition(value) });
					}
					break;

				case 'startsWith':
				case 'starts_with':
					if (value) {
						conditions.push({ [field]: this.startsWithCondition(value) });
					}
					break;

				case 'endsWith':
				case 'ends_with':
					if (value) {
						conditions.push({ [field]: this.endsWithCondition(value) });
					}
					break;

				case 'greaterThan':
				case 'greater_than':
				case '>':
					conditions.push({ [field]: { $gt: value } });
					break;

				case 'greaterThanOrEqual':
				case 'greater_than_or_equal':
				case '>=':
					conditions.push({ [field]: { $gte: value } });
					break;

				case 'lessThan':
				case 'less_than':
				case '<':
					conditions.push({ [field]: { $lt: value } });
					break;

				case 'lessThanOrEqual':
				case 'less_than_or_equal':
				case '<=':
					conditions.push({ [field]: { $lte: value } });
					break;

				case 'in':
					if (Array.isArray(value) && value.length > 0) {
						conditions.push({ [field]: { $in: value } });
					}
					break;

				case 'notIn':
				case 'not_in':
					if (Array.isArray(value) && value.length > 0) {
						conditions.push({ [field]: { $nin: value } });
					}
					break;

				case 'isNull':
				case 'is_null':
					conditions.push({ [field]: null });
					break;

				case 'isNotNull':
				case 'is_not_null':
					conditions.push({ [field]: { $ne: null } });
					break;

				case 'between':
					if (dataType === 'date') {
						if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
							const fromDate = new Date(value.from);
							const toDate = new Date(value.to);
							toDate.setHours(23, 59, 59, 999);
							conditions.push({ [field]: { $gte: fromDate, $lte: toDate } });
						} else if (Array.isArray(value) && value.length === 2) {
							const fromDate = new Date(value[0]);
							const toDate = new Date(value[1]);
							toDate.setHours(23, 59, 59, 999);
							conditions.push({ [field]: { $gte: fromDate, $lte: toDate } });
						}
					} else if (dataType === 'number') {
						if (Array.isArray(value) && value.length === 2) {
							const min =
								value[0] !== '' && value[0] !== null && value[0] !== undefined
									? Number(value[0])
									: null;
							const max =
								value[1] !== '' && value[1] !== null && value[1] !== undefined
									? Number(value[1])
									: null;

							if (min !== null && max !== null && !isNaN(min) && !isNaN(max)) {
								conditions.push({ [field]: { $gte: min, $lte: max } });
							} else if (min !== null && !isNaN(min)) {
								conditions.push({ [field]: { $gte: min } });
							} else if (max !== null && !isNaN(max)) {
								conditions.push({ [field]: { $lte: max } });
							}
						}
					} else {
						if (Array.isArray(value) && value.length === 2) {
							conditions.push({ [field]: { $gte: value[0], $lte: value[1] } });
						}
					}
					break;

				case 'notBetween':
				case 'not_between':
					if (dataType === 'date') {
						if (typeof value === 'object' && value.from !== undefined && value.to !== undefined) {
							const fromDate = new Date(value.from);
							const toDate = new Date(value.to);
							toDate.setHours(23, 59, 59, 999);
							conditions.push({
								$or: [{ [field]: { $lt: fromDate } }, { [field]: { $gt: toDate } }],
							});
						} else if (Array.isArray(value) && value.length === 2) {
							const fromDate = new Date(value[0]);
							const toDate = new Date(value[1]);
							toDate.setHours(23, 59, 59, 999);
							conditions.push({
								$or: [{ [field]: { $lt: fromDate } }, { [field]: { $gt: toDate } }],
							});
						}
					} else if (dataType === 'number') {
						if (Array.isArray(value) && value.length === 2) {
							const min =
								value[0] !== '' && value[0] !== null && value[0] !== undefined
									? Number(value[0])
									: null;
							const max =
								value[1] !== '' && value[1] !== null && value[1] !== undefined
									? Number(value[1])
									: null;

							if (min !== null && max !== null && !isNaN(min) && !isNaN(max)) {
								conditions.push({
									$or: [{ [field]: { $lt: min } }, { [field]: { $gt: max } }],
								});
							}
						}
					} else {
						if (Array.isArray(value) && value.length === 2) {
							conditions.push({
								$or: [{ [field]: { $lt: value[0] } }, { [field]: { $gt: value[1] } }],
							});
						}
					}
					break;

				case 'before':
					if (value) {
						if (dataType === 'date') {
							const beforeDate = new Date(value);
							beforeDate.setHours(0, 0, 0, 0);
							conditions.push({ [field]: { $lt: beforeDate } });
						} else {
							conditions.push({ [field]: { $lt: value } });
						}
					}
					break;

				case 'after':
					if (value) {
						if (dataType === 'date') {
							const afterDate = new Date(value);
							afterDate.setHours(23, 59, 59, 999);
							conditions.push({ [field]: { $gt: afterDate } });
						} else {
							conditions.push({ [field]: { $gt: value } });
						}
					}
					break;

				default:
					console.warn(`Unknown operator: ${operator}`);
					break;
			}
		}

		if (conditions.length === 0) {
			return {};
		}

		return conditions.length === 1 ? conditions[0] : { $and: conditions };
	}

	/**
	 * Resolve relation filter keys (`relation->field`) by querying the related entity
	 * and replacing the condition with an `$in` on the relation's foreign key.
	 * This works uniformly for SQL and MongoDB.
	 */
	private async resolveRelationFilters(query: any): Promise<any> {
		if (!query || typeof query !== 'object' || Object.keys(query).length === 0) {
			return query;
		}

		const resolved: any = {};

		for (const [key, value] of Object.entries(query)) {
			if (key.includes('->')) {
				const [relationPath, ...nestedParts] = key.split('->');
				const nestedField = nestedParts.join('.');
				const prop = this.meta.properties[relationPath];

				if (!prop || !prop.type) {
					console.warn(
						`Relation "${relationPath}" not found on entity "${this.entityName}". ` +
							`Cannot resolve filter "${key}".`,
					);
					continue;
				}

				try {
					const targetMeta = prop.targetMeta;
					if (!targetMeta) {
						console.warn(`Relation "${relationPath}" has no target metadata; cannot resolve "${key}".`);
						continue;
					}
					const targetPk = targetMeta.primaryKeys[0];
					const targetField = this.mapField(nestedField, targetMeta);

					const matching = await this.em.find(targetMeta.class, { [targetField]: value } as any, {
						fields: [targetPk] as any,
					});
					const ids = matching.map((doc: any) => doc[targetPk]);
					resolved[relationPath] = { $in: ids };
				} catch (error) {
					console.warn(`Failed to resolve relation filter for ${key}:`, error);
				}
			} else if (key === '$and' || key === '$or') {
				if (Array.isArray(value)) {
					resolved[key] = await Promise.all(value.map(condition => this.resolveRelationFilters(condition)));
				}
			} else {
				resolved[key] = value;
			}
		}

		return resolved;
	}

	/**
	 * Merge multiple where parts; conflicting top-level keys are pushed into `$and`
	 */
	private mergeWhere(parts: any[]): any {
		const result: any = {};
		const and: any[] = [];

		for (const part of parts) {
			if (!part || Object.keys(part).length === 0) continue;
			for (const [key, value] of Object.entries(part)) {
				if (key === '$and' && Array.isArray(result.$and)) {
					result.$and = [...result.$and, ...(value as any[])];
				} else if (key in result) {
					and.push({ [key]: value });
				} else {
					result[key] = value;
				}
			}
		}

		if (and.length > 0) {
			result.$and = [...(result.$and || []), ...and];
		}

		return result;
	}

	/**
	 * Builds a MikroORM where object from QueryParams for use in widgets/hooks.
	 * Returns the same where object used in list queries; can be passed to em.count()/em.find().
	 */
	async buildFiltersQuery(params: QueryParams): Promise<any> {
		const parts: any[] = [];

		if (params.filters && Object.keys(params.filters).length > 0) {
			parts.push(this.buildInternalFiltersQuery(params.filters));
		}

		if (params.queryBuilders && Object.keys(params.queryBuilders).length > 0) {
			parts.push(this.buildInternalQueryBuilderQuery(params.queryBuilders));
		}

		if (params.search && this.searchableFields.length > 0) {
			parts.push(this.buildInternalSearchQuery(params.search, this.searchableFields));
		}

		const merged = this.mergeWhere(parts);
		return this.resolveRelationFilters(merged);
	}

	/**
	 * Build the orderBy object, falling back to the primary key
	 */
	private buildOrderBy(sort?: string, direction: 'asc' | 'desc' = 'asc'): Record<string, 'asc' | 'desc'> {
		let field = sort ? this.mapField(sort) : this.pk;
		if (!field.includes('.') && !this.meta.properties[field]) {
			field = this.pk;
		}
		return { [field]: direction };
	}

	/**
	 * Convert PopulateOption[] into MikroORM populate paths (e.g. ['author', 'transaction.receiver']).
	 * Unknown relation paths are skipped with a warning.
	 */
	private buildPopulate(populate?: PopulateOption[]): string[] {
		if (!populate || populate.length === 0) {
			return [];
		}

		const paths: string[] = [];

		const walk = (options: PopulateOption[], prefix: string, meta: EntityMetadata | undefined) => {
			for (const option of options) {
				const prop = meta?.properties[option.path];
				if (!prop || prop.kind === 'scalar' || prop.kind === 'embedded') {
					console.warn(
						`Cannot populate "${prefix ? `${prefix}.` : ''}${option.path}": not a relation on "${meta?.className}"`,
					);
					continue;
				}

				const fullPath = prefix ? `${prefix}.${option.path}` : option.path;
				paths.push(fullPath);

				if (option.populate) {
					const nested = Array.isArray(option.populate) ? option.populate : [option.populate];
					walk(nested, fullPath, prop.targetMeta);
				}
			}
		};

		walk(populate, '', this.meta);
		return paths;
	}

	/**
	 * List records with filtering, sorting, and pagination
	 * Supports both regular queries and grouped/aggregated queries
	 */
	async list(params: QueryParams): Promise<QueryResult> {
		if (params.grouping) {
			return this.listGrouped(params);
		}

		const where = await this.buildFiltersQuery(params);
		const orderBy = this.buildOrderBy(params.sort, params.sortDirection || 'asc');
		const populate = this.buildPopulate(params.populate);

		const limit = params.perPage || 10;
		const page = params.page || 1;
		const offset = (page - 1) * limit;

		const [entities, total] = await this.em.findAndCount(this.entity, where, {
			orderBy: orderBy as any,
			limit,
			offset,
			populate: populate as any,
		});

		const pages = Math.ceil(total / limit);

		return {
			data: entities.map(entity => this.serialize(entity)),
			pagination: {
				page,
				limit,
				total,
				pages,
				hasNext: page < pages,
				hasPrev: page > 1,
			},
		};
	}

	/**
	 * List grouped/aggregated records.
	 * SQL: GROUP BY via the query builder. Mongo: aggregation pipeline.
	 * Ratio metrics, sorting and pagination are applied in a shared post-processing step.
	 */
	private async listGrouped(params: QueryParams): Promise<QueryResult> {
		const grouping = params.grouping;
		if (!grouping) {
			throw new Error('Grouping configuration is required for grouped queries');
		}

		const where = await this.buildFiltersQuery(params);

		const rows = this.isMongo()
			? await this.aggregateGroupsMongo(where, grouping)
			: await this.aggregateGroupsSql(where, grouping);

		// Compute ratio metrics in post-processing (uniform across platforms)
		const ratioMetrics = grouping.metrics.filter((m): m is RatioMetric => m.op === 'ratio');
		for (const row of rows) {
			for (const metric of ratioMetrics) {
				const precision = metric.precision ?? 2;
				const numerator = Number(row[metric.numerator]) || 0;
				const rawDenominator = Number(row[metric.denominator]) || 0;
				const denominator = rawDenominator === 0 ? 1 : rawDenominator;
				const factor = Math.pow(10, precision);
				row[metric.name] = Math.round((numerator / denominator) * factor) / factor;
			}
		}

		// Sort
		const sortField = params.sort || grouping.by[0];
		const direction = params.sortDirection === 'desc' ? -1 : 1;
		rows.sort((a, b) => {
			const av = a[sortField];
			const bv = b[sortField];
			if (av == null && bv == null) return 0;
			if (av == null) return -direction;
			if (bv == null) return direction;
			if (av < bv) return -direction;
			if (av > bv) return direction;
			return 0;
		});

		// Paginate
		const total = rows.length;
		const limit = params.perPage || 10;
		const page = params.page || 1;
		const pages = Math.ceil(total / limit);
		const data = rows.slice((page - 1) * limit, (page - 1) * limit + limit);

		return {
			data,
			pagination: {
				page,
				limit,
				total,
				pages,
				hasNext: page < pages,
				hasPrev: page > 1,
			},
		};
	}

	/** Get the database column name for a property (SQL) */
	private columnName(field: string): string {
		const prop = this.meta.properties[this.mapField(field)];
		return prop?.fieldNames?.[0] ?? field;
	}

	/**
	 * Grouped aggregation for SQL platforms using the query builder
	 */
	private async aggregateGroupsSql(where: any, grouping: GroupingConfig): Promise<any[]> {
		const em = this.em as any; // SqlEntityManager
		const qb = em.createQueryBuilder(this.entity, 'e');

		const selects: any[] = [];

		for (const field of grouping.by) {
			selects.push(raw(`\`e\`.\`${this.columnName(field)}\` as \`${field}\``));
		}

		for (const metric of grouping.metrics) {
			switch (metric.op) {
				case 'count': {
					const m = metric as CountMetric;
					if (m.field && m.notNull) {
						selects.push(raw(`count(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					} else {
						selects.push(raw(`count(*) as \`${metric.name}\``));
					}
					break;
				}
				case 'sum': {
					const m = metric as SumMetric;
					selects.push(raw(`sum(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'avg': {
					const m = metric as AvgMetric;
					selects.push(raw(`avg(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'min': {
					const m = metric as MinMetric;
					selects.push(raw(`min(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'max': {
					const m = metric as MaxMetric;
					selects.push(raw(`max(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				// SQL has no positional first/last aggregates - min/max are the closest equivalents
				case 'first': {
					const m = metric as FirstMetric;
					selects.push(raw(`min(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'last': {
					const m = metric as LastMetric;
					selects.push(raw(`max(\`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'countDistinct': {
					const m = metric as CountDistinctMetric;
					selects.push(raw(`count(distinct \`e\`.\`${this.columnName(m.field)}\`) as \`${metric.name}\``));
					break;
				}
				case 'ratio':
					// Computed in post-processing
					break;
			}
		}

		qb.select(selects);

		if (where && Object.keys(where).length > 0) {
			qb.where(where);
		}

		qb.groupBy(grouping.by.map(field => this.mapField(field)));

		const rows: any[] = await qb.execute('all', false);

		// Coerce numeric aggregates (drivers may return strings for SUM/AVG)
		const numericMetrics = grouping.metrics.filter(m => m.op !== 'ratio').map(m => m.name);
		for (const row of rows) {
			for (const name of numericMetrics) {
				if (row[name] !== null && row[name] !== undefined && typeof row[name] === 'string') {
					const n = Number(row[name]);
					if (!Number.isNaN(n)) row[name] = n;
				}
			}
		}

		return rows;
	}

	/**
	 * Grouped aggregation for MongoDB using an aggregation pipeline.
	 * Matching ids are pre-resolved with em.find() so all value conversions
	 * (ObjectId, dates) are handled by the ORM.
	 */
	private async aggregateGroupsMongo(where: any, grouping: GroupingConfig): Promise<any[]> {
		const em = this.em as any; // MongoEntityManager
		const pipeline: any[] = [];

		if (where && Object.keys(where).length > 0) {
			const matched = await this.em.find(this.entity, where, { fields: [this.pk] as any });
			const ids = matched.map((doc: any) => doc[this.pk]);
			pipeline.push({ $match: { _id: { $in: ids } } });
		}

		const fieldName = (field: string) => {
			const prop = this.meta.properties[this.mapField(field)];
			return prop?.fieldNames?.[0] ?? field;
		};

		// $group stage
		const groupStage: any = {
			_id:
				grouping.by.length === 1
					? `$${fieldName(grouping.by[0])}`
					: Object.fromEntries(grouping.by.map(field => [field, `$${fieldName(field)}`])),
		};

		for (const metric of grouping.metrics) {
			switch (metric.op) {
				case 'count': {
					const m = metric as CountMetric;
					if (m.field && m.notNull) {
						groupStage[metric.name] = {
							$sum: { $cond: [{ $ne: [`$${fieldName(m.field)}`, null] }, 1, 0] },
						};
					} else {
						groupStage[metric.name] = { $sum: 1 };
					}
					break;
				}
				case 'sum':
					groupStage[metric.name] = { $sum: `$${fieldName((metric as SumMetric).field)}` };
					break;
				case 'avg':
					groupStage[metric.name] = { $avg: `$${fieldName((metric as AvgMetric).field)}` };
					break;
				case 'min':
					groupStage[metric.name] = { $min: `$${fieldName((metric as MinMetric).field)}` };
					break;
				case 'max':
					groupStage[metric.name] = { $max: `$${fieldName((metric as MaxMetric).field)}` };
					break;
				case 'first':
					groupStage[metric.name] = { $first: `$${fieldName((metric as FirstMetric).field)}` };
					break;
				case 'last':
					groupStage[metric.name] = { $last: `$${fieldName((metric as LastMetric).field)}` };
					break;
				case 'countDistinct':
					groupStage[`${metric.name}_set`] = {
						$addToSet: `$${fieldName((metric as CountDistinctMetric).field)}`,
					};
					break;
				case 'ratio':
					// Computed in post-processing
					break;
			}
		}

		pipeline.push({ $group: groupStage });

		// $project stage - reshape output
		const projectStage: any = { _id: 0 };

		if (grouping.by.length === 1) {
			projectStage[grouping.by[0]] = '$_id';
		} else {
			for (const field of grouping.by) {
				projectStage[field] = `$_id.${field}`;
			}
		}

		for (const metric of grouping.metrics) {
			if (metric.op === 'countDistinct') {
				projectStage[metric.name] = { $size: `$${metric.name}_set` };
			} else if (metric.op !== 'ratio') {
				projectStage[metric.name] = 1;
			}
		}

		pipeline.push({ $project: projectStage });

		return em.aggregate(this.entity, pipeline);
	}

	/**
	 * Query related records based on relation configuration
	 */
	async listRelated(params: RelationQueryParams): Promise<QueryResult> {
		const { parentId, relation, ...queryParams } = params;

		// Coerce the parent id to the related entity's FK type when numeric
		const fkProp = this.meta.properties[this.mapField(relation.foreignKey)];
		let parent = parentId;
		if (fkProp && fkProp.targetMeta) {
			parent = this.coerceId(parentId, fkProp.targetMeta);
		}

		const mergedParams: QueryParams = {
			...queryParams,
			filters: {
				...queryParams.filters,
				[relation.foreignKey]: parent,
			},
		};

		return this.list(mergedParams);
	}

	/**
	 * Set searchable fields for search functionality
	 */
	setSearchableFields(fields: string[]): this {
		this.searchableFields = fields;
		return this;
	}

	/**
	 * Global search across specified fields with OR logic (case-insensitive)
	 * @param query - Search query string
	 * @param searchableFields - Array of field names to search
	 * @param limit - Maximum number of results to return (default: 5)
	 */
	async globalSearch(query: string, searchableFields: string[], limit: number = 5): Promise<any[]> {
		if (!query || !searchableFields || searchableFields.length === 0) {
			return [];
		}

		const where = {
			$or: searchableFields.map(field => ({ [this.mapField(field)]: this.containsCondition(query) })),
		};

		const entities = await this.em.find(this.entity, where as any, { limit });
		return entities.map(entity => this.serialize(entity));
	}
}
