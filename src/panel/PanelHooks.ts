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
}
