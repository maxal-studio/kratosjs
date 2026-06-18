import { Column } from '../Column';
import { Filter } from './filters/Filter';
import { Action } from './actions/Action';
import { BulkAction } from './actions/BulkAction';
import { ActionRegistry } from './actions/ActionRegistry';
import { SerializedTable, PopulateOption, GroupingConfig, MetricDefinition } from '../types';
import { TabDefinition } from './tabs/TabDefinition';
import { QueryBuilderRule } from './filters/QueryBuilderFilter';
import { makeConfigurable } from '../../utils/configurable';

/**
 * TableBuilder class for creating table schemas
 */
export type FiltersLayout = 'inline' | 'dropdown' | 'sidebar';

export class TableBuilder {
	protected _columns: Column[] = [];
	protected _filters: Filter[] = [];
	protected _actions: Action[] = [];
	protected _bulkActions: BulkAction[] = [];
	protected _headerActions: Action[] = [];
	protected _exportable: boolean = true;
	protected _defaultSort?: { column: string; direction: 'asc' | 'desc' };
	protected _paginate: boolean | number = 10;
	protected _recordsPerPageOptions: number[] = [10, 25, 50, 100];
	protected _striped: boolean = false;
	protected _searchable: boolean = false;
	protected _poll?: string;
	protected _deferLoading: boolean = false;
	protected _extremePaginationLinks: number = 1;
	protected _paginationPageOptions: number[] = [];
	protected _filtersLayout: FiltersLayout = 'dropdown';
	protected _extraFields: string[] = [];
	protected _populate: PopulateOption[] = [];
	protected _tabs: TabDefinition[] = [];
	protected _queryBuilder: QueryBuilderRule[] = [];
	protected _showColumnSettings: boolean = true;
	protected _contentGrid?: Record<string, number>;
	protected _gridColumns?: number = 2;
	protected _defaultLayout: 'table' | 'grid' = 'table';
	protected _allowLayoutSwitch: boolean = false;
	protected _grouping?: GroupingConfig;

	/**
	 * Set table columns
	 */
	columns(columns: Column[]): this {
		this._columns = columns;
		return this;
	}

	/**
	 * Set table filters
	 */
	filters(filters: Filter[]): this {
		this._filters = filters;
		return this;
	}

	/**
	 * Set table tabs (quick filters)
	 */
	tabs(tabs: TabDefinition[]): this {
		this._tabs = tabs;
		return this;
	}

	/**
	 * Set always-applied query builder rules (applied at backend, cannot be overridden)
	 * These rules are applied at the end of the list API, after all other filters
	 * Supports OR and AND groups
	 */
	queryBuilder(rules: QueryBuilderRule[]): this {
		this._queryBuilder = rules;
		return this;
	}

	/**
	 * Set row actions
	 */
	actions(actions: Action[]): this {
		this._actions = actions;
		// Register action handlers in the global registry
		for (const action of actions) {
			const handler = action.getHandler();
			if (handler) {
				ActionRegistry.registerAction(action.getName(), handler);
			}
		}
		return this;
	}

	/**
	 * Set bulk actions
	 */
	bulkActions(actions: BulkAction[]): this {
		this._bulkActions = actions;
		// Register bulk action handlers in the global registry
		for (const action of actions) {
			const handler = action.getHandler();
			if (handler) {
				ActionRegistry.registerAction(action.getName(), handler);
			}
		}
		return this;
	}

	/**
	 * Set header actions (buttons rendered at the top of the table, not tied to a row).
	 * Useful for global actions like "Export" or "Import" added by plugins.
	 */
	headerActions(actions: Action[]): this {
		this._headerActions = actions;
		// Register action handlers in the global registry
		for (const action of actions) {
			const handler = action.getHandler();
			if (handler) {
				ActionRegistry.registerAction(action.getName(), handler);
			}
		}
		return this;
	}

	/**
	 * Control whether this table may be exported by export plugins (default: true).
	 * Set to false to opt a resource out of plugin-added export buttons.
	 */
	exportable(condition: boolean = true): this {
		this._exportable = condition;
		return this;
	}

	/**
	 * Whether this table allows exporting.
	 */
	isExportable(): boolean {
		return this._exportable;
	}

	/**
	 * Set default sort column and direction
	 */
	defaultSort(column: string, direction: 'asc' | 'desc' = 'asc'): this {
		this._defaultSort = { column, direction };
		return this;
	}

	/**
	 * Enable pagination
	 * @param perPage - Number of records per page, or true to use default (10)
	 */
	paginate(perPage: boolean | number = true): this {
		if (perPage === true) {
			this._paginate = 10;
		} else if (perPage === false) {
			this._paginate = false;
		} else {
			this._paginate = perPage;
		}
		return this;
	}

	/**
	 * Set records per page options for the dropdown
	 */
	recordsPerPageSelectOptions(options: number[]): this {
		this._recordsPerPageOptions = options;
		return this;
	}

	/**
	 * Enable striped rows
	 */
	striped(condition: boolean = true): this {
		this._striped = condition;
		return this;
	}

	/**
	 * Set filters layout
	 * @param layout - 'inline' (visible), 'dropdown' (hidden in popup), or 'sidebar'
	 */
	filtersLayout(layout: FiltersLayout): this {
		this._filtersLayout = layout;
		return this;
	}

	/**
	 * Enable global search
	 */
	searchable(condition: boolean = true): this {
		this._searchable = condition;
		return this;
	}

	/**
	 * Enable auto-refresh polling
	 * @param interval - Polling interval (e.g., '5s', '10s', '1m')
	 */
	poll(interval: string): this {
		this._poll = interval;
		return this;
	}

	/**
	 * Defer loading until user interaction
	 */
	deferLoading(condition: boolean = true): this {
		this._deferLoading = condition;
		return this;
	}

	/**
	 * Set number of extreme pagination links to show
	 */
	extremePaginationLinks(count: number): this {
		this._extremePaginationLinks = count;
		return this;
	}

	/**
	 * Set pagination page options
	 */
	paginationPageOptions(options: number[]): this {
		this._paginationPageOptions = options;
		return this;
	}

	/**
	 * Show or hide column settings button
	 * @param condition - true to show, false to hide (default: true)
	 */
	showColumnSettings(condition: boolean = true): this {
		this._showColumnSettings = condition;
		return this;
	}

	/**
	 * Configure responsive grid columns for grid view
	 * @param config - Breakpoint-based column configuration (e.g., { 'md': 2, 'xl': 3 })
	 * @example
	 * TableBuilder.make()
	 *   .contentGrid({ 'md': 2, 'xl': 3 })
	 *   // Results in: 1 col mobile, 2 cols tablet, 3 cols desktop
	 */
	contentGrid(config: Record<string, number>): this {
		this._contentGrid = config;
		return this;
	}

	/**
	 * Set the number of grid columns per row (simpler alternative to contentGrid)
	 * This sets a default number of columns that will be used across all breakpoints
	 * @param columns - Number of columns per row (e.g., 2 for two columns)
	 * @example
	 * TableBuilder.make()
	 *   .gridColumns(2)
	 *   // Results in: 2 columns per row on all screen sizes
	 */
	gridColumns(columns: number): this {
		this._gridColumns = columns;
		return this;
	}

	/**
	 * Set default layout (table or grid)
	 * @param layout - 'table' or 'grid' (default: 'table')
	 */
	defaultLayout(layout: 'table' | 'grid'): this {
		this._defaultLayout = layout;
		return this;
	}

	/**
	 * Allow users to toggle between table and grid layouts
	 * @param allow - true to show layout toggle button, false to hide (default: false)
	 */
	allowLayoutSwitch(allow: boolean = true): this {
		this._allowLayoutSwitch = allow;
		return this;
	}

	/**
	 * Define extra fields to include in API response that are not declared as columns.
	 * Useful for data needed in formatStateUsing functions.
	 *
	 * @example
	 * TableBuilder.make()
	 *   .columns([...])
	 *   .extraFields(['mediaFile', 'thumbnailUrl', 'metadata'])
	 */
	extraFields(fields: string[]): this {
		this._extraFields = fields;
		return this;
	}

	/**
	 * Specify relations to populate when fetching table data.
	 * Paths must be MikroORM relation property names on the entity.
	 * This allows columns to access and display related data (e.g., author.name).
	 *
	 * @example
	 * TableBuilder.make()
	 *   .columns([...])
	 *   .populate([
	 *     { path: 'author' },
	 *     { path: 'category', populate: { path: 'parent' } }
	 *   ])
	 */
	populate(relations: PopulateOption[]): this {
		this._populate = relations;
		// Add relation paths to extra fields
		for (const relation of relations) {
			this._extraFields.push(relation.path);
		}

		return this;
	}

	/**
	 * Get extra fields
	 */
	getExtraFields(): string[] {
		return this._extraFields;
	}

	/**
	 * Get all columns
	 */
	getColumns(): Column[] {
		return this._columns;
	}

	/**
	 * Get all filters
	 */
	getFilters(): Filter[] {
		return this._filters;
	}

	/**
	 * Get all actions
	 */
	getActions(): Action[] {
		return this._actions;
	}

	/**
	 * Get all bulk actions
	 */
	getBulkActions(): BulkAction[] {
		return this._bulkActions;
	}

	/**
	 * Get all header actions
	 */
	getHeaderActions(): Action[] {
		return this._headerActions;
	}

	/**
	 * Get default sort configuration
	 */
	getDefaultSort(): { column: string; direction: 'asc' | 'desc' } | undefined {
		return this._defaultSort;
	}

	/**
	 * Check if pagination is enabled
	 */
	isPaginated(): boolean {
		return this._paginate !== false;
	}

	/**
	 * Get records per page
	 */
	getRecordsPerPage(): number {
		if (typeof this._paginate === 'number') {
			return this._paginate;
		}
		return 10; // default
	}

	/**
	 * Check if table has striped rows
	 */
	isStriped(): boolean {
		return this._striped;
	}

	/**
	 * Check if global search is enabled
	 */
	isSearchable(): boolean {
		return this._searchable;
	}

	/**
	 * Get filters layout
	 */
	getFiltersLayout(): FiltersLayout {
		return this._filtersLayout;
	}

	/**
	 * Check if column settings button should be shown
	 */
	isColumnSettingsVisible(): boolean {
		return this._showColumnSettings;
	}

	/**
	 * Get populate relations
	 */
	getPopulate(): PopulateOption[] {
		return this._populate;
	}

	/**
	 * Configure grouping and metrics for aggregated tables
	 * @param config - Grouping configuration with fields and metrics
	 * @example
	 * TableBuilder.make()
	 *   .grouping({
	 *     by: ['userId'],
	 *     metrics: [
	 *       { name: 'totalSent', op: 'count' },
	 *       { name: 'totalOpened', op: 'count', field: 'openedAt', notNull: true },
	 *       { name: 'openedRatio', op: 'ratio', numerator: 'totalOpened', denominator: 'totalSent' }
	 *     ]
	 *   })
	 */
	grouping(config: GroupingConfig): this {
		this._grouping = config;
		return this;
	}

	/**
	 * Set the grouping field(s) - convenience method
	 * Must be used with metrics() to define what to compute
	 * @param fields - Field name(s) to group by
	 */
	groupBy(fields: string | string[]): this {
		const fieldArray = Array.isArray(fields) ? fields : [fields];
		if (!this._grouping) {
			this._grouping = { by: fieldArray, metrics: [] };
		} else {
			this._grouping.by = fieldArray;
		}
		return this;
	}

	/**
	 * Set the metrics to compute for grouped data - convenience method
	 * Must be used with groupBy() to specify grouping field(s)
	 * @param metrics - Array of metric definitions
	 */
	metrics(metrics: MetricDefinition[]): this {
		if (!this._grouping) {
			this._grouping = { by: [], metrics };
		} else {
			this._grouping.metrics = metrics;
		}
		return this;
	}

	/**
	 * Get grouping configuration
	 */
	getGrouping(): GroupingConfig | undefined {
		return this._grouping;
	}

	/**
	 * Serialize table to JSON
	 */
	toJSON(): SerializedTable {
		return {
			type: 'table',
			columns: this._columns.map(col => col.toJSON()),
			filters: this._filters.length > 0 ? this._filters.map(f => f.toJSON()) : undefined,
			actions: this._actions.length > 0 ? this._actions.map(a => a.toJSON()) : undefined,
			bulkActions: this._bulkActions.length > 0 ? this._bulkActions.map(a => a.toJSON()) : undefined,
			headerActions: this._headerActions.length > 0 ? this._headerActions.map(a => a.toJSON()) : undefined,
			defaultSort: this._defaultSort,
			paginate: this._paginate !== false ? true : false,
			recordsPerPage: typeof this._paginate === 'number' ? this._paginate : 10,
			recordsPerPageOptions: this._recordsPerPageOptions,
			striped: this._striped || true,
			searchable: this._searchable,
			poll: this._poll,
			deferLoading: this._deferLoading,
			extremePaginationLinks: this._extremePaginationLinks,
			paginationPageOptions: this._paginationPageOptions,
			filtersLayout: this._filtersLayout,
			extraFields: this._extraFields.length > 0 ? this._extraFields : undefined,
			populate: this._populate.length > 0 ? this._populate : undefined,
			tabs: this._tabs.length > 0 ? this._tabs : undefined,
			queryBuilder: this._queryBuilder.length > 0 ? this._queryBuilder : undefined,
			showColumnSettings: this._showColumnSettings,
			contentGrid: this._contentGrid,
			gridColumns: this._gridColumns,
			defaultLayout: this._defaultLayout,
			allowLayoutSwitch: this._allowLayoutSwitch,
			grouping: this._grouping,
		};
	}

	/**
	 * Create a new TableBuilder instance
	 */
	static make(): TableBuilder {
		return new TableBuilder();
	}

	private static _configurator = makeConfigurable<TableBuilder>();

	/**
	 * Register a callback that mutates every table in the panel.
	 * Applied after a resource defines its table and before serialization.
	 * @example
	 * TableBuilder.configureUsing((table) =>
	 *   table.headerActions([...table.getHeaderActions(), exportAction]));
	 */
	static configureUsing(cb: (table: TableBuilder) => void): typeof TableBuilder {
		this._configurator.register(cb);
		return this;
	}

	/** Apply all registered global configuration callbacks to a table. */
	static applyConfiguration(table: TableBuilder): void {
		this._configurator.apply(table);
	}

	/** Remove all registered global configuration callbacks. */
	static clearConfigurations(): void {
		this._configurator.clear();
	}
}
