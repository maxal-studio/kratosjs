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
 * Mutable context passed to every media hook describing a single upload/delete
 * request. `before*` hooks mutate it (e.g. swap `file` for a compressed buffer,
 * rename `filename`, reroute `bucket`); `after*` hooks observe `result`.
 *
 * Trust boundary — important for authorization decisions:
 * - **Server-trusted**: `user` (from the JWT), `resourceSlug` (from the route, undefined
 *   for the global non-resource routes), and `key` (the actual storage key on delete).
 * - **Client-provided hints**: `fieldName`, `recordId`, `isArray`, `existingValue` on the
 *   upload/delete *routes* come from the request body and can be forged. `recordId` is also
 *   absent on create (the record doesn't exist yet). Use them for logging/UX, NOT to gate
 *   access. Associate a file with a record securely at record-save time via resource hooks
 *   (keyed by the returned `key`), or rely on `key` ownership in `mediaDeleteAccessCheck`.
 * - Exception: for backend cascade deletes fired by `Panel.deleteMediaFiles` (record
 *   update/delete), `resourceSlug`/`recordId` come from the server and ARE trustworthy.
 */
export interface MediaHookContext {
	operation: 'upload' | 'delete';
	/** Server-trusted: the authenticated user (from the JWT). */
	user?: AuthUser;
	/** Server-trusted: the resource from the route; undefined on global media routes. */
	resourceSlug?: string;
	/** Client hint on upload/delete routes (forgeable); server-trusted on backend cascade deletes. */
	fieldName?: string;
	/** Client hint on upload/delete routes (forgeable, absent on create); server-trusted on backend cascade deletes. */
	recordId?: string;
	/** Client hint on upload routes. */
	isArray?: boolean;
	/** Client hint on upload routes. */
	existingValue?: any;
	bucket?: string;
	// upload-only (mutable in beforeMediaUpload)
	/** The file bytes to store. Replace this in a beforeMediaUpload hook to compress/crop/transform. */
	file?: Buffer;
	filename?: string;
	contentType?: string;
	path?: string;
	visibility?: 'public' | 'private';
	/** Extra storage metadata, forwarded to the adapter's upload options. */
	metadata?: Record<string, any>;
	// delete-only
	key?: string;
	/** Populated after a successful upload, before afterMediaUpload hooks run. */
	result?: { key: string; url?: string; bucket?: string };
	/** Set when onMediaError hooks run. */
	error?: Error;
}

export type MediaAccessCheckHook = (ctx: MediaHookContext) => Promise<boolean> | boolean;

/**
 * A media lifecycle hook handler. Mirrors the resource-level `HookHandler`:
 * receives the mutable {@link MediaHookContext}, runs in registration order.
 */
export type MediaHookHandler = (ctx: MediaHookContext) => Promise<void> | void;

/**
 * Array-based media lifecycle hooks, the media analog of `ResourceHooks`.
 * Registered via `Panel.registerMediaHooks(...)`; handlers stack (arrays are
 * concatenated) and run in order so each sees the prior handler's mutations.
 */
export interface MediaHooks {
	/** Before storage — mutate ctx.file/filename/contentType/path/visibility/bucket/metadata. Throw to abort. */
	beforeMediaUpload?: MediaHookHandler[];
	/** After storage — observe ctx.result (link the file to a user/entity, log, etc.). */
	afterMediaUpload?: MediaHookHandler[];
	/** Before deletion — inspect ctx.key. Throw to abort. */
	beforeMediaDelete?: MediaHookHandler[];
	/** After deletion — observe (unlink, log, etc.). */
	afterMediaDelete?: MediaHookHandler[];
	/** Runs once when an upload/delete throws (ctx.error set); never rethrows. */
	onMediaError?: MediaHookHandler[];
}

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
}
