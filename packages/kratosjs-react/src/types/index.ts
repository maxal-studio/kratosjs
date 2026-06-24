import { SerializedForm, ValidationRules as KratosJsValidationRules } from '@maxal_studio/kratosjs';
import { ColumnRegistry } from '../contexts/ColumnRegistryContext';
import { WidgetComponent } from '../contexts/WidgetRegistryContext';
import type { CustomBlockComponent } from '../contexts/BlockRegistryContext';
import type { AuthChallengeRegistry } from '../contexts/AuthChallengeRegistryContext';
import type { ClientI18nConfig } from '../i18n/buildClientI18n';
import type { KratosPluginClient } from '../plugin';

/**
 * Props passed to all field components
 */
export interface FieldProps {
	type: string;
	name: string;
	label?: string;
	statePath?: string;
	default?: any;
	hidden?: boolean;
	disabled?: boolean;
	mode?: 'edit' | 'view';
	value?: any;
	extraAttributes?: Record<string, any>;
	validation?: KratosJsValidationRules;
	helperText?: string;
	hint?: string;
	hintIcon?: string;
	hintColor?: string;
	autofocus?: boolean;
	placeholder?: string;
	readOnly?: boolean;
	/** When true, view mode displays the value as HTML (TextInput, Textarea, TagsInput) */
	renderHtml?: boolean;
	inputType?: string;
	minLength?: number;
	maxLength?: number;
	min?: number;
	max?: number;
	step?: number;
	mask?: string;
	prefix?: string;
	suffix?: string;
	options?: Record<string | number, string>;
	multiple?: boolean;
	isMultiple?: boolean;
	searchable?: boolean;
	creatable?: boolean;
	// Relationship-based select properties
	relationship?: {
		name: string;
		titleAttribute: string;
		resource?: string;
	};
	createOptionForm?: any[]; // Form schema for creating new related records
	createOptionModalHeading?: string;
	optionLabelFormatter?: string; // Serialized function for formatting option labels
	// TagsInput-specific properties
	tags?: string[];
	separator?: string;
	suggestions?: string[];
	/** When true, view mode shows tags in a popup (e.g. "N tags" click to open) */
	showInPopup?: boolean;
	selectablePlaceholder?: boolean;
	rows?: number;
	cols?: number;
	format?: string;
	displayFormat?: string;
	minDate?: string;
	maxDate?: string;
	enableTime?: boolean;
	onColor?: string;
	offColor?: string;
	onIcon?: string;
	offIcon?: string;
	// Repeater-specific properties
	schema?: FieldProps[]; // Schema for Repeater and Group
	defaultItems?: number;
	minItems?: number;
	maxItems?: number;
	addable?: boolean;
	deletable?: boolean;
	reorderable?: boolean;
	itemLabel?: string;
	// FileUpload-specific properties
	acceptedFileTypes?: string[];
	maxSize?: number;
	minSize?: number;
	maxFiles?: number;
	disk?: string;
	directory?: string;
	visibility?: 'public' | 'private';
	// RichEditor-specific properties
	toolbarButtons?: string[];
	fileAttachments?: boolean;
	embeds?: boolean;
	htmlSource?: boolean;
	extensions?: string[];
	// Section-specific properties
	heading?: string;
	icon?: string;
	collapsible?: boolean; // For both Repeater and Section
	collapsed?: boolean;
	compact?: boolean;
	aside?: boolean;
	// Column layout properties
	columns?: number | Record<string, number>;
	columnSpan?: number | string | Record<string, number | string>;
	columnStart?: number | Record<string, number>;
	required?: boolean;
	/** Operation for conditional visibility (e.g. hidden(context => context.operation === 'view')) */
	operation?: 'create' | 'edit' | 'view';
	[key: string]: any;
}

/**
 * Field component type
 */
export type FieldComponent = React.ComponentType<FieldProps>;

/**
 * Field registry mapping field types to components
 */
export type FieldRegistry = Record<string, FieldComponent>;

/**
 * Props for FormRenderer component
 */
export interface FormRendererProps {
	schema: SerializedForm;
	onSubmit: (data: any) => void | Promise<void>;
	defaultValues?: Record<string, any>;
	className?: string;
	/** Base URL for API requests (e.g., 'http://localhost:3001/kratosjs/api') */
	apiBaseUrl?: string;
	/** Resource slug for media endpoints (e.g., 'users') */
	resource?: string;
	/** Operation type for conditional field visibility (e.g., 'create' | 'edit' | 'view') */
	operation?: 'create' | 'edit' | 'view';
	/** Children to render inside FormProvider (for watching form values) */
	children?: React.ReactNode;
}

/**
 * Props for FieldRenderer component
 */
export interface FieldRendererProps {
	field: FieldProps;
}

/**
 * Validation rules from React Hook Form (converted format)
 */
export interface RHFValidationRules {
	required?: string | { value: boolean; message: string };
	pattern?: { value: RegExp; message: string };
	minLength?: { value: number; message: string };
	maxLength?: { value: number; message: string };
	min?: { value: number; message: string };
	max?: { value: number; message: string };
	validate?: Record<string, (value: any, formValues?: any) => boolean | string>;
}

/**
 * Redirect response from API
 */
export interface RedirectResponse {
	redirect: string;
	message?: string;
	[key: string]: any;
}

/**
 * Type guard to check if response is a redirect response
 */
export function isRedirectResponse(data: any): data is RedirectResponse {
	return typeof data === 'object' && data !== null && typeof data.redirect === 'string';
}

/**
 * Relation metadata served by GET /:slug/relations, consumed by the view modal
 */
export interface SerializedRelation {
	name: string;
	type: 'hasMany';
	canCreate?: boolean;
	canEdit?: boolean;
	canDelete?: boolean;
	canView?: boolean;
	resourceSlug: string;
	/** Full API URL for the related resource */
	resourceApiUrl?: string;
	label: string;
	pluralLabel: string;
	icon?: string;
	localKey: string;
	foreignKey: string;
	relatedKey: string;
	// Optional grouping metadata (when backend RelationConfig defines a group)
	groupKey?: string;
	groupLabel?: string;
	groupIcon?: string;
}

/**
 * Widget registry mapping widget types to components
 */
export type WidgetRegistry = Record<string, WidgetComponent>;

/**
 * Block registry mapping custom block types to components
 */
export type BlockRegistry = Record<string, CustomBlockComponent>;

/**
 * Props for AdminPanel component
 */
export interface AdminPanelProps {
	apiBaseUrl: string;
	panelId?: string;
	customFields?: FieldRegistry;
	customColumns?: ColumnRegistry;
	customWidgets?: WidgetRegistry;
	customBlocks?: BlockRegistry;
	customAuthChallenges?: AuthChallengeRegistry;
	/** i18n config for UI chrome + app frontend strings. */
	i18nConfig?: ClientI18nConfig;
	/** Plugin client manifests — their `translations` feed the i18n engine. */
	plugins?: KratosPluginClient[];
}
