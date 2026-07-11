import type { KratosMiddleware, KratosRequest, KratosReply } from '../http/types';
import { ResourceClass } from '../BaseResource.js';
import { DataAdapter } from '../adapters/database/DataAdapter';
import { ResourceHooks } from '../resource/types';
import { Widget } from '../widgets/Widget';

/**
 * Action execution response
 */
export interface ActionResponse {
	redirect?: string;
	success: boolean;
	message?: string;
	data?: any;
	/** When true, the frontend will refetch navigation badges after the action completes */
	refreshBadges?: boolean;
}

/**
 * Action handler function type
 * Used for both row actions and bulk actions
 *
 * Receives data = { records?: any[], formData?: any }
 * For single actions: records will be an array with one item
 * For bulk actions: records will be an array with multiple items
 * Use getRequestContext() from the package to get request context inside the handler
 * Return refreshBadges: true to trigger navigation badge refresh when the action finishes.
 */
export type ActionHandler = (data: { records?: any[]; formData?: any }) => Promise<ActionResponse>;

/**
 * Adapter class constructor type
 * Allows passing adapter class instead of instance.
 * Receives the MikroORM instance, the entity to operate on, and the searchable fields.
 */
export type AdapterClass = new (orm: any, entity: any, searchableFields?: string[]) => DataAdapter;

/**
 * Panel configuration options
 */
export interface PanelConfig {
	/** Unique identifier for the panel */
	id: string;
	/** Base path for all routes (e.g., '/api/admin') */
	basePath: string;
	/** Adapter class to use for all resources */
	adapterClass?: AdapterClass;
	/** Default searchable fields for all resources */
	defaultSearchableFields?: string[];
	/** Registered resource classes */
	resources: ResourceClass[];
	/** Framework-neutral middleware to apply to all routes */
	middleware: KratosMiddleware[];
}

/**
 * Registered resource instance with adapter
 */
export interface RegisteredResource {
	/** The resource class */
	resourceClass: ResourceClass;
	/** The data adapter instance for this resource */
	adapter: DataAdapter;
	/** Action handlers for this resource */
	actions: Record<string, ActionHandler>;
	/** Hook handlers for this resource */
	hooks?: ResourceHooks;
	/** Widget instances for this resource */
	widgets?: Map<string, Widget>;
}

/**
 * Route handler context passed to route handlers
 */
export interface RouteContext {
	/** The registered resource */
	resource: RegisteredResource;
	/** Framework-neutral request */
	req: KratosRequest;
	/** Framework-neutral reply */
	reply: KratosReply;
}

/**
 * Panel route definition
 */
export interface PanelRoute {
	method: 'get' | 'post' | 'put' | 'patch' | 'delete';
	path: string;
	handler: (context: RouteContext) => Promise<void>;
}

/**
 * Schema response for form endpoint
 */
export interface FormSchemaResponse {
	resource: string;
	schema: any;
}

/**
 * Schema response for table endpoint
 */
export interface TableSchemaResponse {
	resource: string;
	schema: any;
}

/**
 * Navigation badge result: value and optional color for the sidebar badge.
 * color can be a semantic name (e.g. 'blue', 'green', 'red', 'yellow', 'gray') or a CSS color.
 */
export interface NavigationBadge {
	value: string | number;
	color?: 'blue' | 'green' | 'red' | 'yellow' | 'gray' | string;
}

/**
 * Action execution request body
 */
export interface ActionRequest {
	action: string;
	data: {
		recordIds: string[]; // IDs to populate on backend
		formData?: any;
	};
	isBulk?: boolean;
}

/**
 * Resource metadata for frontend consumption
 */
export interface ResourceMetadata {
	slug: string;
	label: string;
	pluralLabel: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hasForm: boolean;
	hasTable: boolean;
	hasActions: boolean;
	hasRelations: boolean;
	hidden?: boolean;
	excluded?: boolean;
}

/**
 * Page metadata for frontend consumption
 */
export interface PageMetadata {
	slug: string;
	label: string;
	icon?: string;
	navigationGroup?: string;
	navigationSort?: number;
	hidden?: boolean;
	excluded?: boolean;
}

/**
 * Panel metadata for frontend consumption.
 * Custom component entries carry the registered type names only; the matching
 * React components are bundled into the app's admin client from plugin client
 * manifests.
 */
export interface PanelMetadata {
	id: string;
	title?: string;
	/** Lucide icon name for in-app branding (header, login screen) */
	icon?: string;
	/** Favicon URL — used for the browser tab and as a logo image in the UI when set */
	favicon?: string;
	basePath: string;
	resources: ResourceMetadata[];
	pages: PageMetadata[];
	globalSearchAvailable: boolean;
	customBlocks?: string[];
	customFields?: string[];
	customColumns?: string[];
	customWidgets?: string[];
}
