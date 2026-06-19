import { Request, Response } from 'express';
import type { Panel } from '../../Panel';
import { getFilteredCapabilities } from '../access';
import { MediaHookContext } from '../PanelHooks';

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
 * - The `mediaUploaded` / `mediaDeleted` hooks let a media-manager plugin link a stored file
 *   to its owner (user/entity) and clean that link up on delete.
 */
export class MediaController {
	constructor(private panel: Panel) {}

	/**
	 * Resolve the resource slug for the current request, if this is a per-resource route.
	 * Global media routes have no `panelResource`, so this returns undefined.
	 */
	private getResourceSlug(req: Request): string | undefined {
		return req.panelResource?.resourceClass.getSlug();
	}

	/**
	 * Enforce per-resource write access. Returns true when allowed (or when there is no
	 * resource context, i.e. a global route); writes a 403 and returns false otherwise.
	 */
	private async ensureResourceWriteAccess(req: Request, res: Response): Promise<boolean> {
		const registered = req.panelResource;
		if (!registered) {
			return true;
		}

		const caps = await getFilteredCapabilities(this.panel, registered, req.authUser);
		if (!caps.canCreate && !caps.canEdit) {
			res.status(403).json({
				message: 'You do not have permission to manage media for this resource',
			});
			return false;
		}

		return true;
	}

	/**
	 * Handle media file upload
	 * Expects the file to be sent as base64 in the JSON body
	 */
	async handleUpload(req: Request, res: Response): Promise<void> {
		try {
			const {
				file,
				filename,
				contentType,
				fieldName,
				recordId,
				isArray,
				existingValue,
				path,
				visibility,
				bucket,
			} = req.body;

			if (!file) {
				res.status(400).json({
					message: 'File data is required',
				});
				return;
			}

			// Per-resource write-access gate (no-op for global routes)
			if (!(await this.ensureResourceWriteAccess(req, res))) {
				return;
			}

			const context: MediaHookContext = {
				operation: 'upload',
				user: req.authUser,
				resourceSlug: this.getResourceSlug(req),
				fieldName,
				recordId,
				isArray,
				existingValue,
				bucket,
				filename,
				contentType,
				path,
				visibility,
			};

			// Plugin authorization hook (the only policy gate for global routes)
			if (this.panel.hooks.mediaUploadAccessCheck) {
				const allowed = await this.panel.hooks.mediaUploadAccessCheck(context);
				if (!allowed) {
					res.status(403).json({
						message: 'You do not have permission to upload this file',
					});
					return;
				}
			}

			// Get media adapter by bucket name (or use default)
			const mediaAdapter = bucket
				? this.panel.media.getAdapter(bucket)
				: this.panel.media.getAdapter() || this.panel.media.getOrCreateDefaultAdapter();

			if (!mediaAdapter) {
				res.status(400).json({
					message: 'Media adapter not found',
				});
				return;
			}

			// Convert base64 to buffer
			const fileBuffer = Buffer.from(file, 'base64');

			// Upload the file
			const uploadResult = await mediaAdapter.upload(fileBuffer, {
				filename: filename || 'file',
				contentType,
				path,
				visibility,
			});

			// Notify plugins so they can link the stored file to its owner (user/entity)
			await this.panel.hooks.mediaUploaded?.({ key: uploadResult.key, url: uploadResult.url, bucket }, context);

			res.status(200).json({
				data: {
					url: uploadResult.url,
					key: uploadResult.key,
				},
			});
		} catch (error: any) {
			console.error('Error uploading media:', error);
			res.status(500).json({
				message: error.message || 'Failed to upload media',
			});
		}
	}

	/**
	 * Handle media file deletion
	 */
	async handleDelete(req: Request, res: Response): Promise<void> {
		try {
			const { key, bucket, fieldName, recordId } = req.body;

			if (!key) {
				res.status(400).json({
					message: 'File key is required',
				});
				return;
			}

			// Per-resource write-access gate (no-op for global routes)
			if (!(await this.ensureResourceWriteAccess(req, res))) {
				return;
			}

			// Get media adapter by bucket name (or use default)
			// If key is an object with bucket, use that
			const bucketName = bucket || (typeof key === 'object' && key.bucket ? key.bucket : undefined);
			const actualKey = typeof key === 'object' && key.key ? key.key : key;

			const context: MediaHookContext = {
				operation: 'delete',
				user: req.authUser,
				resourceSlug: this.getResourceSlug(req),
				fieldName,
				recordId,
				bucket: bucketName,
				key: actualKey,
			};

			// Plugin authorization hook: guards against arbitrary-key deletion.
			// A media-manager plugin can verify the key is owned by the requesting user.
			if (this.panel.hooks.mediaDeleteAccessCheck) {
				const allowed = await this.panel.hooks.mediaDeleteAccessCheck(context);
				if (!allowed) {
					res.status(403).json({
						message: 'You do not have permission to delete this file',
					});
					return;
				}
			}

			const mediaAdapter = bucketName
				? this.panel.media.getAdapter(bucketName)
				: this.panel.media.getAdapter() || this.panel.media.getOrCreateDefaultAdapter();

			if (!mediaAdapter) {
				res.status(400).json({
					message: 'Media adapter not found',
				});
				return;
			}

			// Delete the file
			await mediaAdapter.delete(actualKey);

			// Notify plugins so they can remove the corresponding owner link
			await this.panel.hooks.mediaDeleted?.(context);

			res.status(200).json({
				success: true,
				message: 'File deleted successfully',
			});
		} catch (error: any) {
			console.error('Error deleting media:', error);
			res.status(500).json({
				message: error.message || 'Failed to delete media',
			});
		}
	}
}
