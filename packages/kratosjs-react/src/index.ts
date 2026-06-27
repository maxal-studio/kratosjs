// Main exports
export { FormRenderer } from './FormRenderer';
export { FieldRenderer } from './FieldRenderer';

// Plugin-author API
export { definePluginClient, mergePluginClients } from './plugin';
export type { KratosPluginClient, MergedPluginRegistries } from './plugin';

// App entry (mount the admin SPA)
export { mountAdminPanel } from './app';
export type { MountAdminPanelOptions } from './app';

// Field registry
export { FieldRegistryProvider, FieldRegistryContext, useFieldRegistry } from './contexts/FieldRegistryContext';
export type { FieldRegistryProviderProps } from './contexts/FieldRegistryContext';

// Hooks
export { useValidation } from './hooks/useValidation';

// Field utilities (for custom field components)
export { getFieldError } from './utils/fieldErrors';

// HTTP / API layer
export { ApiError, apiFetch, apiGet, apiPost } from './api/http';
export { TableApiClient } from './api/tableApi';
export type { QueryParams, QueryResult, PaginationMeta } from './api/tableApi';
export { executeAction, executeBulkAction } from './api/actionsApi';
export type { ActionResult } from './api/actionsApi';
export * as resourceApi from './api/resourceApi';
export { authenticatedFetch } from './api/authenticatedFetch';
export { deriveApiBaseUrl, resourceSlugFromUrl } from './api/urls';

// Condition / serialized-function runtime
export { evaluateCondition, evaluateConditionAst } from './runtime/conditions';
export type { Condition, ConditionAst, ConditionOperator } from './runtime/conditions';
export { executeSerializedFunction, compileSerializedFunction } from './runtime/serializedFunctions';

// UI primitives (stable styling contract for plugin authors)
export {
	Button,
	IconButton,
	Input,
	Textarea,
	Select,
	Label,
	Badge,
	Card,
	Spinner,
	EmptyState,
	ErrorAlert,
	ToastProvider,
	useToast,
	ConfirmProvider,
	useConfirm,
} from './components/ui';
export type {
	ButtonProps,
	IconButtonProps,
	ButtonVariant,
	ButtonSize,
	InputProps,
	TextareaProps,
	SelectProps,
	LabelProps,
	BadgeProps,
	BadgeVariant,
	CardProps,
	SpinnerProps,
	EmptyStateProps,
	ErrorAlertProps,
	ToastApi,
	ToastOptions,
	ToastVariant,
	ConfirmOptions,
} from './components/ui';
export { ErrorBoundary } from './components/errors/ErrorBoundary';
export type { ErrorBoundaryProps } from './components/errors/ErrorBoundary';

// Filter Components
export { QueryBuilderFilterComponent } from './components/filters/QueryBuilderFilterComponent';
export { CustomFilterComponent } from './components/filters/CustomFilterComponent';

// Types
export type {
	FieldProps,
	FieldComponent,
	FieldRegistry,
	FormRendererProps,
	FieldRendererProps,
	RHFValidationRules,
	SerializedRelation,
} from './types';

// Built-in field components (for custom rendering or extending)
export { TextInputField } from './components/TextInputField';
export { SelectField } from './components/SelectField';
export { TextareaField } from './components/TextareaField';
export { CheckboxField } from './components/CheckboxField';
export { ToggleField } from './components/ToggleField';
export { RadioField } from './components/RadioField';
export { DateTimePickerField } from './components/DateTimePickerField';
export { ColorPickerField } from './components/ColorPickerField';
export { RepeaterField } from './components/RepeaterField';
export { HiddenField } from './components/HiddenField';
export { FileUploadField } from './components/FileUploadField';
export { RichEditorField } from './components/RichEditorField';
export { SectionField } from './components/SectionField';
export { GroupField } from './components/GroupField';
export { HintDisplay } from './components/utils/HintDisplay';
export type { HintDisplayProps } from './components/utils/HintDisplay';
export { ViewFieldWrapper } from './components/utils/ViewFieldWrapper';
export type { ViewFieldWrapperProps } from './components/utils/ViewFieldWrapper';

// Utilities
export { cn } from './utils/classNames';

// Icon component and types
export { Icon } from './components/utils/Icon';
export type { IconName, IconProps } from './components/utils/Icon';
// Re-export all Lucide icons for convenience
export * from 'lucide-react';

// Table
export { TableRenderer } from './TableRenderer';
export type { TableRendererProps } from './TableRenderer';
export { useTableContext } from './table/TableContext';
export type { TableContextValue } from './table/TableContext';

// Modals
export { ViewModal } from './components/ViewModal';
export { ResourceFormModal } from './components/modals/ResourceFormModal';
export type { ResourceFormModalProps } from './components/modals/ResourceFormModal';
export { RelationCreateModal } from './components/modals/RelationCreateModal';
export { ActionFormModal } from './components/ActionFormModal';
export { ModalDrawer } from './components/ModalDrawer';
export { useResourceForm } from './components/modals/useResourceForm';
export type { UseResourceFormOptions, ResourceFormApi, ResourceFormMode } from './components/modals/useResourceForm';

// Table context
export { ColumnRegistryProvider, useColumnRegistry } from './contexts/ColumnRegistryContext';
export type { ColumnRegistry, ColumnComponent } from './contexts/ColumnRegistryContext';

// Modal context
export { ResourceModalProvider, useResourceModal } from './contexts/ResourceModalContext';
export type { ModalState } from './contexts/ResourceModalContext';

// Panel metadata context
export { PanelMetadataProvider, usePanelMetadata } from './contexts/PanelMetadataContext';
export type { PageMetadata } from './contexts/PanelMetadataContext';

// Table column components (for custom rendering or extending)
export { TextColumnComponent } from './components/columns/TextColumnComponent';
export type { ColumnProps } from './components/columns/TextColumnComponent';
export { IconColumnComponent } from './components/columns/IconColumnComponent';
export { ImageColumnComponent } from './components/columns/ImageColumnComponent';
export { VideoColumnComponent } from './components/columns/VideoColumnComponent';
export { MediaColumnComponent } from './components/columns/MediaColumnComponent';
export { ColorColumnComponent } from './components/columns/ColorColumnComponent';
export { TagsColumnComponent } from './components/columns/TagsColumnComponent';
export { ViewColumnComponent } from './components/columns/ViewColumnComponent';
export { CheckboxColumnComponent } from './components/columns/CheckboxColumnComponent';
export { ToggleColumnComponent } from './components/columns/ToggleColumnComponent';
export { SelectColumnComponent } from './components/columns/SelectColumnComponent';
export { TextInputColumnComponent } from './components/columns/TextInputColumnComponent';

// AdminPanel component
export { AdminPanel } from './components/AdminPanel';
export type { AdminPanelProps, BlockRegistry } from './types';

// Internationalization (i18n)
export {
	I18nProvider,
	useI18nContext,
	useTranslation,
	useLocale,
	useFormatter,
	LocaleSwitcher,
	getActiveLocale,
	translate,
	buildClientI18n,
} from './i18n';
export type {
	I18nContextValue,
	I18nProviderProps,
	ClientI18nConfig,
	ClientTranslations,
	LocaleSwitcherProps,
} from './i18n';

// Auth components
export { AuthProvider, useAuth } from './auth/AuthContext';
export { LoginPage } from './auth/LoginPage';
export { ProtectedRoute } from './auth/ProtectedRoute';
export { AuthApiClient } from './auth/authApiClient';
export type {
	AuthUser,
	AuthProvider as AuthProviderType,
	AuthTokens,
	LoginCredentials,
	LoginResult,
	PendingChallenge,
	AuthChallengeProps,
	AuthChallengeComponent,
} from './auth/types';
export {
	AuthChallengeRegistryProvider,
	AuthChallengeRegistryContext,
	useAuthChallengeRegistry,
} from './contexts/AuthChallengeRegistryContext';
export type { AuthChallengeRegistry } from './contexts/AuthChallengeRegistryContext';

// Widget exports
export { WidgetRegistryProvider, useWidgetRegistry } from './contexts/WidgetRegistryContext';
export { StatsWidget } from './components/widgets/StatsWidget';
export { ChartWidget } from './components/widgets/ChartWidget';
export { WidgetRenderer } from './components/widgets/WidgetRenderer';
export type { WidgetComponentProps } from './contexts/WidgetRegistryContext';
export type { StatsWidgetProps } from './components/widgets/StatsWidget';
export type { ChartWidgetProps } from './components/widgets/ChartWidget';
export type { WidgetRendererProps } from './components/widgets/WidgetRenderer';

// Slots (additive UI injection points)
export { Slot, SlotCluster, renderSlot, SLOT_NAMES } from './slots';
export type {
	SlotProps,
	SlotClusterProps,
	SlotName,
	BuiltInSlotName,
	SlotContext,
	SlotRender,
	SlotContribution,
	SlotMap,
	ResolvedSlots,
} from './slots';
export { SlotRegistryProvider, SlotRegistryContext, useSlot, useSlotRegistry } from './contexts/SlotRegistryContext';
export type { SlotRegistryProviderProps } from './contexts/SlotRegistryContext';

// Block registry (custom blocks)
export { BlockRegistryProvider, useBlockRegistry } from './contexts/BlockRegistryContext';
export type {
	CustomBlockComponentProps,
	CustomBlockComponent,
	BlockRegistry as BlockRegistryType,
} from './contexts/BlockRegistryContext';
