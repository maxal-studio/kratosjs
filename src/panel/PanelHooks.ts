import { PanelMetadata } from './types';
import { AuthUser } from '../auth/types';

export type DataOperation = 'create' | 'read' | 'update' | 'delete' | 'list' | 'findById';

export interface ResourceCapabilities {
	canCreate: boolean;
	canEdit: boolean;
	canDelete: boolean;
	canView: boolean;
}

export type MetadataFilterHook = (metadata: PanelMetadata, user?: AuthUser) => Promise<PanelMetadata> | PanelMetadata;
export type SchemaFilterHook = (schema: any, resourceSlug: string, user?: AuthUser) => Promise<any> | any;
export type PageBlocksFilterHook = (blocks: any[], pageSlug: string, user?: AuthUser) => Promise<any[]> | any[];
export type PageAccessCheckHook = (pageSlug: string, user?: AuthUser) => Promise<boolean> | boolean;
export type DataFilterHook = (
	records: any[],
	resourceSlug: string,
	operation: DataOperation,
	user?: AuthUser,
) => Promise<any[]> | any[];
export type CapabilitiesFilterHook = (
	capabilities: ResourceCapabilities,
	resourceSlug: string,
	user?: AuthUser,
) => Promise<ResourceCapabilities> | ResourceCapabilities;
export type ActionAccessCheckHook = (
	actionName: string,
	resourceSlug: string,
	user?: AuthUser,
) => Promise<boolean> | boolean;

/**
 * Context passed to media hooks describing a single upload/delete request.
 * `resourceSlug` is undefined for the global (non-resource) media routes.
 */
export interface MediaHookContext {
	operation: 'upload' | 'delete';
	user?: AuthUser;
	resourceSlug?: string;
	fieldName?: string;
	recordId?: string;
	isArray?: boolean;
	existingValue?: any;
	bucket?: string;
	// upload-only
	filename?: string;
	contentType?: string;
	path?: string;
	visibility?: 'public' | 'private';
	// delete-only
	key?: string;
}

export type MediaAccessCheckHook = (ctx: MediaHookContext) => Promise<boolean> | boolean;
export type MediaUploadedHook = (
	result: { key: string; url?: string; bucket?: string },
	ctx: MediaHookContext,
) => Promise<void> | void;
export type MediaDeletedHook = (ctx: MediaHookContext) => Promise<void> | void;

/**
 * Registry for permission/filtering hooks registered by plugins.
 *
 * Plugins register hooks through the corresponding Panel.register*Hook() methods;
 * the panel's controllers read them from this registry when serving requests.
 */
export class PanelHooks {
	metadataFilter?: MetadataFilterHook;
	formSchemaFilter?: SchemaFilterHook;
	tableSchemaFilter?: SchemaFilterHook;
	pageBlocksFilter?: PageBlocksFilterHook;
	pageAccessCheck?: PageAccessCheckHook;
	dataFilter?: DataFilterHook;
	capabilitiesFilter?: CapabilitiesFilterHook;
	actionAccessCheck?: ActionAccessCheckHook;
	mediaUploadAccessCheck?: MediaAccessCheckHook;
	mediaDeleteAccessCheck?: MediaAccessCheckHook;
	mediaUploaded?: MediaUploadedHook;
	mediaDeleted?: MediaDeletedHook;
}
