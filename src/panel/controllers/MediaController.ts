import type { KratosRequest, KratosReply } from '../../http/types';
import type { Panel } from '../../Panel';
import { getFilteredCapabilities } from '../access';
import { MediaHookContext } from '../PanelHooks';
import { t } from '../../i18n/serverT';

/**
 * Generic media upload/delete endpoints (global and per-resource).
 *
 * Authorization model:
 * - Authentication is enforced upstream by `authMiddleware` in the route registration.
 * - For the per-resource routes (`/:resource/media/...`) the requesting user must have
 *   write access (canCreate || canEdit) on the resource. Media delete here means
 *   "remove/replace a file while editing a record", so it intentionally does NOT require
 *   the record `delete` capability.
 * - The media access-check hooks (`mediaUploadAccessCheck` / `mediaDeleteAccessCheck`) layer
 *   on top for fine-grained / ownership-based authorization and are the only policy gate the
 *   global (non-resource) routes get beyond authentication. Default (unset) = allow.
 * - The array-based media lifecycle hooks (`beforeMediaUpload`/`afterMediaUpload`/
 *   `beforeMediaDelete`/`afterMediaDelete`/`onMediaError`, registered via
 *   `panel.registerMediaHooks`) let plugins transform the uploaded bytes (compress/crop),
 *   link a stored file to its owner, log, and audit failures.
 */
export class MediaController {
	constructor(private panel: Panel) {}

	/**
	 * Resolve the resource slug for the current request, if this is a per-resource route.
	 * Global media routes have no `panelResource`, so this returns undefined.
	 */
	private getResourceSlug(req: KratosRequest): string | undefined {
		return req.panelResource?.resourceClass.getSlug();
	}

	/**
	 * Enforce per-resource write access. Returns true when allowed (or when there is no
	 * resource context, i.e. a global route); writes a 403 and returns false otherwise.
	 */
	private async ensureResourceWriteAccess(req: KratosRequest, reply: KratosReply): Promise<boolean> {
		const registered = req.panelResource;
		if (!registered) {
			return true;
		}

		const caps = await getFilteredCapabilities(this.panel, registered, req.authUser);
		if (!caps.canCreate && !caps.canEdit) {
			reply.status(403).json({
				message: t('core:media.no_permission_manage'),
			});
			return false;
		}

		return true;
	}

	/**
	 * Handle media file upload
	 * Expects the file to be sent as base64 in the JSON body
	 */
	async handleUpload(req: KratosRequest, reply: KratosReply): Promise<void> {
		let context: MediaHookContext | undefined;
		try {
			const { file, filename, contentType, fieldName, isArray, existingValue, path, visibility, bucket } =
				req.body;

			if (!file) {
				reply.status(400).json({
					message: t('core:media.file_required'),
				});
				return;
			}

			// Per-resource write-access gate (no-op for global routes)
			if (!(await this.ensureResourceWriteAccess(req, reply))) {
				return;
			}

			context = {
				operation: 'upload',
				user: req.authUser,
				resourceSlug: this.getResourceSlug(req),
				fieldName,
				isArray,
				existingValue,
				bucket,
				// The buffer is mutable: a beforeMediaUpload hook may replace it (compress/crop).
				file: Buffer.from(file, 'base64'),
				filename,
				contentType,
				path,
			};

			// Plugin authorization hook (the only policy gate for global routes)
			if (this.panel.hooks.mediaUploadAccessCheck) {
				const allowed = await this.panel.hooks.mediaUploadAccessCheck(context);
				if (!allowed) {
					reply.status(403).json({
						message: t('core:media.no_permission_upload'),
					});
					return;
				}
			}

			// Lifecycle: let plugins transform the bytes / options before storage
			await this.panel.executeMediaHooks('beforeMediaUpload', context);

			// Get media adapter by bucket name (a hook may have rerouted it; else use default)
			const mediaAdapter = context.bucket
				? this.panel.media.getAdapter(context.bucket)
				: this.panel.media.getAdapter() || this.panel.media.getOrCreateDefaultAdapter();

			if (!mediaAdapter) {
				reply.status(400).json({
					message: t('core:media.adapter_not_found'),
				});
				return;
			}

			// Upload the (possibly transformed) file using the post-hook options.
			// `visibility` is a storage option taken straight from the request (not hook-mutable).
			const uploadResult = await mediaAdapter.upload(context.file as Buffer, {
				filename: context.filename || 'file',
				contentType: context.contentType,
				path: context.path,
				visibility,
				metadata: context.metadata,
			});

			context.result = { key: uploadResult.key, url: uploadResult.url, bucket: context.bucket };

			// Lifecycle: let plugins link the stored file to its owner, log, etc.
			await this.panel.executeMediaHooks('afterMediaUpload', context);

			reply.status(200).json({
				data: {
					url: context.result.url,
					key: context.result.key,
				},
			});
		} catch (error: any) {
			await this.runErrorHooks(context, error);
			console.error('Error uploading media:', error);
			reply.status(500).json({
				message: error.message || 'Failed to upload media',
			});
		}
	}

	/**
	 * Handle media file deletion
	 */
	async handleDelete(req: KratosRequest, reply: KratosReply): Promise<void> {
		let context: MediaHookContext | undefined;
		try {
			const { key, bucket, fieldName } = req.body;

			if (!key) {
				reply.status(400).json({
					message: t('core:media.key_required'),
				});
				return;
			}

			// Per-resource write-access gate (no-op for global routes)
			if (!(await this.ensureResourceWriteAccess(req, reply))) {
				return;
			}

			// Resolve the bucket/key (the key may arrive as a plain string or a { key, bucket } object)
			const bucketName = bucket || (typeof key === 'object' && key.bucket ? key.bucket : undefined);
			const actualKey = typeof key === 'object' && key.key ? key.key : key;

			context = {
				operation: 'delete',
				user: req.authUser,
				resourceSlug: this.getResourceSlug(req),
				fieldName,
				bucket: bucketName,
				key: actualKey,
			};

			// Plugin authorization hook: guards against arbitrary-key deletion.
			// A media-manager plugin can verify the key is owned by the requesting user.
			if (this.panel.hooks.mediaDeleteAccessCheck) {
				const allowed = await this.panel.hooks.mediaDeleteAccessCheck(context);
				if (!allowed) {
					reply.status(403).json({
						message: t('core:media.no_permission_delete'),
					});
					return;
				}
			}

			// Lifecycle: let plugins inspect/abort before deletion
			await this.panel.executeMediaHooks('beforeMediaDelete', context);

			const mediaAdapter = context.bucket
				? this.panel.media.getAdapter(context.bucket)
				: this.panel.media.getAdapter() || this.panel.media.getOrCreateDefaultAdapter();

			if (!mediaAdapter) {
				reply.status(400).json({
					message: t('core:media.adapter_not_found'),
				});
				return;
			}

			// Delete the file
			await mediaAdapter.delete(context.key as string);

			// Lifecycle: let plugins remove the owner link, log, etc.
			await this.panel.executeMediaHooks('afterMediaDelete', context);

			reply.status(200).json({
				success: true,
				message: t('core:media.deleted'),
			});
		} catch (error: any) {
			await this.runErrorHooks(context, error);
			console.error('Error deleting media:', error);
			reply.status(500).json({
				message: error.message || 'Failed to delete media',
			});
		}
	}

	/**
	 * Run onMediaError hooks for a failed operation. Swallows hook errors so a
	 * faulty audit handler can never mask the original failure.
	 */
	private async runErrorHooks(context: MediaHookContext | undefined, error: any): Promise<void> {
		if (!context) return;
		context.error = error instanceof Error ? error : new Error(String(error));
		try {
			await this.panel.executeMediaHooks('onMediaError', context);
		} catch (hookError) {
			console.error('Error in onMediaError hook:', hookError);
		}
	}
}
