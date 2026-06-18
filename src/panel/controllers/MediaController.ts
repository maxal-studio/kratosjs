import { Request, Response } from 'express';
import type { Panel } from '../../Panel';

/**
 * Generic media upload/delete endpoints (global and per-resource).
 */
export class MediaController {
	constructor(private panel: Panel) {}

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
				fieldName: _fieldName,
				recordId: _recordId,
				isArray: _isArray,
				existingValue: _existingValue,
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
			const { key, bucket } = req.body;

			if (!key) {
				res.status(400).json({
					message: 'File key is required',
				});
				return;
			}

			// Get media adapter by bucket name (or use default)
			// If key is an object with bucket, use that
			const bucketName = bucket || (typeof key === 'object' && key.bucket ? key.bucket : undefined);
			const actualKey = typeof key === 'object' && key.key ? key.key : key;
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
