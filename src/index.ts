// Core
export { Resource } from './Resource.js';
export { Panel, DEFAULT_PANEL_FAVICON } from './Panel';
export type { DriverKind, OrmOptions } from './panel/OrmManager';
export { idProps } from './orm/idProps';
export { BaseResource } from './BaseResource.js';
export type { ResourceClass } from './BaseResource.js';
export type { KratosJsRequest, KratosJsResponse, KratosJsRequestHandler } from './panel/request';

// Database Adapters
export { DataAdapter } from './adapters/database/DataAdapter';
export { MikroOrmAdapter } from './adapters/database/MikroOrmAdapter';

// HTTP contract (v2 pluggable HTTP framework support)
// Framework adapters live in their own packages, e.g. @maxal_studio/kratosjs-express.
export { KratosHttpAdapter } from './http/KratosHttpAdapter';
export { createReply, buildKratosRequest, parseByteSize, composeHandler } from './http';
export { serializeCookie, serializeClearCookie, parseCookieHeader } from './http/cookies';
export { AdminSpaService, transformAdminIndexHtml } from './http/adminSpa';
export type { AdminSpaDevServer, ConnectMiddleware } from './http/adminSpa';
export type {
	HttpMethod,
	KratosRequest,
	KratosReply,
	KratosHandler,
	KratosMiddleware,
	KratosRouteHandler,
	KratosRequestInit,
	CookieOptions,
	CorsOptions,
	RouteDefinition,
	StaticMount,
	AdapterInitContext,
	ReplyDriver,
} from './http/types';

// Media Adapters
export { MediaAdapter, S3MediaAdapter, LocalMediaAdapter } from './adapters/media';
export type {
	MediaUploadResult,
	MediaUploadOptions,
	MediaDeleteOptions,
	MediaUrlOptions,
	MediaFormatContext,
	ResolvedMediaValue,
	S3MediaAdapterConfig,
	LocalMediaAdapterConfig,
} from './adapters/media';

// Validators
export { SchemaValidator } from './validators/SchemaValidator';
export { TableValidator } from './validators/TableValidator';

// Shared validation engine (used by both backend and frontend)
export { ValidationEngine, builtInRules, kindOf, isEmpty, resolveValidationCondition } from './validation';
export type {
	ValueKind,
	RuleContext,
	RuleDefinition,
	RuleViolation,
	ValidateValueOptions,
	ConditionContext,
	ValidationEngineImpl,
} from './validation';

// Internationalization (i18n). The universal server `t()` and `withLocale()` are
// SERVER-ONLY (they use AsyncLocalStorage), exported here from the server entry.
// The engine + types come from the browser-safe barrel and are reusable on both sides.
export { t, withLocale, getServerI18n, resolveServerLocale, registerServerI18n } from './i18n/serverT';
export { KratosI18n, createI18n } from './i18n/KratosI18n';
export { resolveRequestLocale, parseAcceptLanguage } from './i18n/resolveRequestLocale';
export type { LocaleSources } from './i18n/resolveRequestLocale';
export { coreResources } from './i18n/locales/core';
export type {
	I18nConfig,
	I18nResources,
	NamespaceResources,
	Catalog,
	Direction,
	TranslateOptions,
	Translator,
} from './i18n/types';

// Panel Types
export type {
	ActionHandler,
	AdapterClass,
	PanelConfig,
	RegisteredResource,
	PanelMetadata,
	ResourceMetadata,
	ActionRequest,
	ActionResponse,
	NavigationBadge,
} from './panel/types';

// Types
export type {
	ResourceConfig,
	QueryParams,
	QueryResult,
	QueryBuilderRule,
	CreateResult,
	UpdateResult,
	DeleteResult,
	RelationConfig,
	SerializedRelation,
	RelationType,
	HookContext,
	HookHandler,
	ResourceHooks,
} from './resource/types';
export { ValidationError } from './resource/types';

// FormBuilder
export {
	FormBuilder,
	Field,
	Component,
	Serializer,
	TextInput,
	SelectInput,
	Textarea,
	Toggle,
	Section,
	Checkbox,
	Radio,
	DateTimePicker,
	ColorPicker,
	FileUpload,
	Repeater,
	TagsInput,
	RichEditor,
	Group,
	Tabs,
	Tab,
	HiddenInput,
} from './formbuilder';
export {
	traverseFormComponents,
	traverseComponent,
	getChildComponents,
	collectFieldNames,
	isValueComponent,
	isArrayScope,
} from './utils/formSchemaTraversal';

export type {
	FormContext,
	SerializedComponent,
	SerializedForm,
	ValidationRule,
	ValidationRules,
	KratosValidationRules,
	ValidationRuleName,
	ParameterizedRule,
	ValidationRuleInput,
} from './formbuilder';

// TableBuilder
export {
	Column,
	TableBuilder,
	TextColumn,
	IconColumn,
	ImageColumn,
	VideoColumn,
	MediaColumn,
	ColorColumn,
	TagsColumn,
	ViewColumn,
	BadgeColumn,
	CheckboxColumn,
	ToggleColumn,
	SelectColumn,
	TextInputColumn,
	Filter,
	SelectFilter,
	TernaryFilter,
	DateFilter,
	QueryBuilderFilter,
	CustomFilter,
	textConstraint,
	numberConstraint,
	booleanConstraint,
	selectConstraint,
	dateConstraint,
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
	Action,
	BulkAction,
	ActionRegistry,
} from './tablebuilder';

export type {
	SerializedTable,
	SerializedColumn,
	SerializedAction,
	SerializedFilter,
	MediaType,
	MediaTypeFn,
	ThumbnailFn,
	TabDefinition,
	PopulateOption,
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
	Constraint,
	Operator,
	FiltersLayout,
	IconName,
	IconColor,
} from './tablebuilder';

// Widgets
export { Widget } from './widgets/Widget';
export { StatsWidget } from './widgets/StatsWidget';
export { ChartWidget } from './widgets/ChartWidget';
export type { SerializedWidget } from './widgets/Widget';
export type { SerializedStatsWidget } from './widgets/StatsWidget';
export type { SerializedChartWidget, ChartDataPoint } from './widgets/ChartWidget';

// Pages and Blocks
export { Page } from './Page';
export type { SerializedPage } from './Page';
export type { RequestContext } from './RequestContext';
export { getRequestContext } from './RequestContextStorage';
export { Block } from './blocks/Block';
export { WidgetBlock } from './blocks/WidgetBlock';
export { FormBlock } from './blocks/FormBlock';
export { TableBlock } from './blocks/TableBlock';
export { TabsBlock } from './blocks/TabsBlock';
export type { SerializedBlock } from './blocks/Block';
export type { SerializedWidgetBlock } from './blocks/WidgetBlock';
export type { SerializedFormBlock } from './blocks/FormBlock';
export type { SerializedTableBlock } from './blocks/TableBlock';
export type { SerializedTabsBlock, SerializedTab } from './blocks/TabsBlock';

// Auth
export * from './auth';

// Plugins
export { Plugin } from './plugins/Plugin';
export type { Exporter, ExportContext, ExportResult } from './panel/export';
export type {
	MetadataFilterHook,
	SchemaFilterHook,
	PageBlocksFilterHook,
	PageAccessCheckHook,
	DataFilterHook,
	CapabilitiesFilterHook,
	ActionAccessCheckHook,
	MediaHookContext,
	MediaAccessCheckHook,
	MediaHooks,
	MediaHookHandler,
	DataOperation,
	ResourceCapabilities,
} from './panel/PanelHooks';
export { makeConfigurable } from './utils/configurable';
export type { Configurator } from './utils/configurable';

// Admin client scaffolding
export { scaffoldAdminClient } from './scaffold/adminClient.js';
export type { ScaffoldAdminClientResult } from './scaffold/adminClient.js';
