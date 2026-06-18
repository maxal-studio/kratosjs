// Core type definitions for the table builder system
import type { SerializedForm } from '../formbuilder/types';
import type { TabDefinition } from './table/tabs/TabDefinition';
import type { QueryBuilderRule } from './table/filters/QueryBuilderFilter';

export type Constructor<T = object> = new (...args: any[]) => T;

/**
 * Metric operation types for grouping
 */
export type MetricOperation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'ratio' | 'first' | 'last' | 'countDistinct';

/**
 * Base metric definition
 */
export interface BaseMetric {
	/** Unique name for this metric (used as field name in results) */
	name: string;
	/** The aggregation operation to perform */
	op: MetricOperation;
}

/**
 * Count metric - counts records in each group
 */
export interface CountMetric extends BaseMetric {
	op: 'count';
	/** Optional field to count (if omitted, counts all records) */
	field?: string;
	/** Only count non-null values */
	notNull?: boolean;
}

/**
 * Sum metric - sums numeric values
 */
export interface SumMetric extends BaseMetric {
	op: 'sum';
	/** Field to sum */
	field: string;
}

/**
 * Average metric - averages numeric values
 */
export interface AvgMetric extends BaseMetric {
	op: 'avg';
	/** Field to average */
	field: string;
}

/**
 * Min metric - finds minimum value
 */
export interface MinMetric extends BaseMetric {
	op: 'min';
	/** Field to find minimum */
	field: string;
}

/**
 * Max metric - finds maximum value
 */
export interface MaxMetric extends BaseMetric {
	op: 'max';
	/** Field to find maximum */
	field: string;
}

/**
 * Ratio metric - computes ratio between two other metrics
 */
export interface RatioMetric extends BaseMetric {
	op: 'ratio';
	/** Name of the numerator metric (must be defined in same metrics array) */
	numerator: string;
	/** Name of the denominator metric (must be defined in same metrics array) */
	denominator: string;
	/** Number of decimal places (default: 2) */
	precision?: number;
}

/**
 * First metric - gets the first value in the group
 */
export interface FirstMetric extends BaseMetric {
	op: 'first';
	/** Field to get first value from */
	field: string;
}

/**
 * Last metric - gets the last value in the group
 */
export interface LastMetric extends BaseMetric {
	op: 'last';
	/** Field to get last value from */
	field: string;
}

/**
 * Count distinct metric - counts unique values in a field
 */
export interface CountDistinctMetric extends BaseMetric {
	op: 'countDistinct';
	/** Field to count distinct values */
	field: string;
}

/**
 * Union type for all metric definitions
 */
export type MetricDefinition =
	| CountMetric
	| SumMetric
	| AvgMetric
	| MinMetric
	| MaxMetric
	| RatioMetric
	| FirstMetric
	| LastMetric
	| CountDistinctMetric;

/**
 * Grouping configuration for tables
 */
export interface GroupingConfig {
	/** Field(s) to group by */
	by: string[];
	/** Metrics to compute for each group */
	metrics: MetricDefinition[];
	/** Optional label field for prettier group display (can reference populated field like 'userId.name') */
	labelField?: string;
}

/**
 * Resolvable type - can be a static value, a function with no args, or a function with a 'get' parameter
 * The 'get' function allows accessing state for conditional logic
 */
export type Resolvable<T> = T | (() => T) | ((get: (field: string) => any) => T);

// Column serialization
export interface SerializedColumn {
	type: string;
	name: string;
	label?: string;
	hidden?: boolean;
	hiddenFn?: string;
	disabled?: boolean;
	disabledFn?: string;
	sortable?: boolean;
	sortColumn?: string;
	searchable?: boolean;
	searchColumns?: string[];
	toggleable?: boolean;
	toggledHiddenByDefault?: boolean;
	alignment?: string;
	width?: string | number;
	wrap?: boolean;
	tooltip?: string;
	/**
	 * In grid view, whether this column should span the full width
	 * Useful for media columns (image, video) that should take full card width
	 */
	gridSpanFull?: boolean;
	color?: any;
	iconPosition?: string;
	description?: string;
	copyable?: boolean;
	copyMessage?: string;
	copyMessageDuration?: number;
	url?: string;
	openUrlInNewTab?: boolean;
	columnSpan?: number | 'full';
	placeholder?: string;
	// TextColumn specific
	rowIndex?: boolean;
	rowIndexFromZero?: boolean;
	limit?: number;
	limitedListExpandable?: boolean;
	formatStateUsing?: string;
	dateFormat?: string;
	dateFormatString?: string;
	moneyFormat?: string;
	badge?: boolean;
	bulleted?: boolean;
	listWithLineBreaks?: boolean;
	listLimit?: number;
	weight?: string;
	fontFamily?: string;
	lineClamp?: number;
	size?: string | number;
	stripHtml?: boolean;
	// IconColumn specific
	icon?: string | Record<string, string>;
	iconFn?: string; // Serialized function
	iconColor?: string | Record<string, string>;
	iconColorFn?: string; // Serialized function
	// ImageColumn specific
	disk?: string;
	height?: string | number;
	circular?: boolean;
	square?: boolean;
	visibility?: string;
	defaultImageUrl?: string;
	stacked?: boolean;
	overlap?: number;
	ring?: number;
	limitedRemainingText?: boolean;
	// TagsColumn specific
	separator?: string;
	// ViewColumn specific
	view?: string;
	// Editable columns specific
	options?: Record<string, string>;
	selectablePlaceholder?: boolean;
	inputType?: string;
	rules?: string[];
	onIcon?: string;
	offIcon?: string;
	onColor?: string;
	offColor?: string;
	beforeStateUpdated?: string;
	afterStateUpdated?: string;
	// Deeplink configuration
	deeplink?: {
		resource?: string;
		page?: string;
		id?: string; // Serialized function or static string
		idFn?: string; // Explicitly store the function separately
		edit?: boolean;
	};
	[key: string]: unknown;
}

// Filter serialization
export interface SerializedFilter {
	type: string;
	name: string;
	label?: string;
	default?: any;
	options?: Record<string, string>;
	placeholder?: string;
	trueLabel?: string;
	falseLabel?: string;
	multiple?: boolean;
	component?: string; // For custom filters
	componentProps?: Record<string, any>; // For custom filters
	constraints?: any[]; // For query builder
	constraintPickerColumns?: Record<string, number | null>; // For query builder
	constraintPickerWidth?: string; // For query builder
	rules?: any[]; // Current query builder state
	[key: string]: unknown;
}

// Action serialization
export interface SerializedAction {
	type: string;
	name: string;
	label?: string;
	icon?: string;
	color?: string;
	requiresConfirmation?: boolean;
	modalHeading?: string;
	modalDescription?: string;
	form?: SerializedForm;
	[key: string]: unknown;
}

// Filters layout type
export type FiltersLayout = 'inline' | 'dropdown' | 'sidebar';

/**
 * Populate option referencing a relation property on the entity.
 * The path must be a MikroORM relation property name (e.g. 'author').
 * Use nested `populate` to populate relations inside the related entity (e.g. transaction.receiver).
 */
export interface PopulateOption {
	path: string;
	/** Optional list of fields to expose for the related entity (informational) */
	select?: string;
	/** Nested populate: populate relations inside this relation (e.g. { path: 'receiver' }) */
	populate?: PopulateOption | PopulateOption[];
}

// Table serialization
export interface SerializedTable {
	type: 'table';
	columns: SerializedColumn[];
	filters?: SerializedFilter[];
	actions?: SerializedAction[];
	bulkActions?: SerializedAction[];
	headerActions?: SerializedAction[];
	defaultSort?: {
		column: string;
		direction: 'asc' | 'desc';
	};
	paginate?: boolean;
	recordsPerPage?: number;
	recordsPerPageOptions?: number[];
	striped?: boolean;
	searchable?: boolean;
	poll?: string;
	deferLoading?: boolean;
	extremePaginationLinks?: number;
	paginationPageOptions?: number[];
	filtersLayout?: FiltersLayout;
	/**
	 * Extra fields to include in API response that are not declared as columns.
	 * Useful for data needed in formatStateUsing functions.
	 */
	extraFields?: string[];
	/**
	 * Relations to populate when fetching table data.
	 * Can be an array of strings (e.g., ['userId', 'categoryId']) or objects with field selection
	 * (e.g., [{ path: 'userId', select: 'name surname' }, { path: 'categoryId', select: 'title' }]).
	 * This allows columns to access and display related data using formatStateUsing.
	 */
	populate?: PopulateOption[];
	/**
	 * Tabs for quick filters displayed at the top of the table
	 */
	tabs?: TabDefinition[];
	/**
	 * Always-applied query builder rules (applied at backend, cannot be overridden)
	 * These rules are applied at the end of the list API, after all other filters
	 */
	queryBuilder?: QueryBuilderRule[];
	/**
	 * Widget metadata (set dynamically by Panel when widgets are defined)
	 */
	widgets?: any[];
	/**
	 * Whether to show the column settings/visibility toggle button
	 * Default: true
	 */
	showColumnSettings?: boolean;
	/**
	 * Responsive grid configuration for grid view layout
	 * Maps breakpoints to column counts (e.g., { 'md': 2, 'xl': 3 })
	 */
	contentGrid?: Record<string, number>;
	/**
	 * Number of grid columns per row (simpler alternative to contentGrid)
	 * Sets a default number of columns across all breakpoints
	 */
	gridColumns?: number;
	/**
	 * Default layout mode - 'table' or 'grid'
	 * Default: 'table'
	 */
	defaultLayout?: 'table' | 'grid';
	/**
	 * Whether to allow users to toggle between table and grid layouts
	 * Default: false
	 */
	allowLayoutSwitch?: boolean;
	/**
	 * Grouping configuration - when present, table shows aggregated rows instead of raw records
	 */
	grouping?: GroupingConfig;
	[key: string]: unknown;
}
