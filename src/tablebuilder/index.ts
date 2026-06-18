// Core exports
export * from './types';
export type { IconName, IconColor, IconCallback, ColorCallback } from './table/columns/lucideIcons';
export type {
	GroupingConfig,
	MetricDefinition,
	MetricOperation,
	CountMetric,
	SumMetric,
	AvgMetric,
	MinMetric,
	MaxMetric,
	RatioMetric,
	FirstMetric,
	LastMetric,
	CountDistinctMetric,
	BaseMetric,
} from './types';

// Base classes
export { Column } from './Column';

// Table Builder
export { TableBuilder } from './table/TableBuilder';
export type { FiltersLayout } from './table/TableBuilder';

// Display-only columns
export { TextColumn } from './table/columns/TextColumn';
export { IconColumn } from './table/columns/IconColumn';
export { ImageColumn } from './table/columns/ImageColumn';
export { VideoColumn } from './table/columns/VideoColumn';
export { MediaColumn } from './table/columns/MediaColumn';
export type { MediaType, MediaTypeFn, ThumbnailFn } from './table/columns/MediaColumn';
export { ColorColumn } from './table/columns/ColorColumn';
export { TagsColumn } from './table/columns/TagsColumn';
export { ViewColumn } from './table/columns/ViewColumn';
export { BadgeColumn } from './table/columns/BadgeColumn';

// Editable columns
export { CheckboxColumn } from './table/columns/CheckboxColumn';
export { ToggleColumn } from './table/columns/ToggleColumn';
export { SelectColumn } from './table/columns/SelectColumn';
export { TextInputColumn } from './table/columns/TextInputColumn';

// Filters
export { Filter } from './table/filters/Filter';
export { SelectFilter } from './table/filters/SelectFilter';
export { TernaryFilter } from './table/filters/TernaryFilter';
export { DateFilter } from './table/filters/DateFilter';
export {
	QueryBuilderFilter,
	textConstraint,
	numberConstraint,
	booleanConstraint,
	selectConstraint,
	dateConstraint,
} from './table/filters/QueryBuilderFilter';
export { CustomFilter } from './table/filters/CustomFilter';
export type { Constraint, Operator, QueryBuilderRule } from './table/filters/QueryBuilderFilter';

// Tabs
export type { TabDefinition } from './table/tabs/TabDefinition';
export {
	equalsRule,
	notEqualsRule,
	greaterThanRule,
	greaterThanOrEqualRule,
	lessThanRule,
	lessThanOrEqualRule,
	betweenRule,
	notBetweenRule,
	isNullRule,
	isNotNullRule,
	beforeRule,
	afterRule,
	containsRule,
	startsWithRule,
	endsWithRule,
	inRule,
	notInRule,
	orRule,
	andRule,
} from './table/tabs/tabRuleHelpers';

// Actions
export { Action } from './table/actions/Action';
export type { ActionHandler } from './table/actions/Action';
export { BulkAction } from './table/actions/BulkAction';
export type { BulkActionHandler } from './table/actions/BulkAction';
export { ActionRegistry } from './table/actions/ActionRegistry';
