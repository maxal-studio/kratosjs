import * as path from 'path';
import { MediaAdapter } from '../adapters/media/MediaAdapter';
import { LocalMediaAdapter } from '../adapters/media/LocalMediaAdapter';
import { SerializedForm } from '../formbuilder/types';
import { MediaFileInfo, findExistingMediaByKey } from '../utils/mediaHelpers';
import { findFieldConfigByName } from '../utils/formHelpers';
import { getFileUploadFields, getMediaFieldsFromTableSchema } from '../utils/panelHelpers';

export interface StaticMount {
	path: string;
	directory: string;
}

/**
 * Owns the media adapters of a Panel and every media-field transformation:
 * - adapter registration/lookup (named buckets + default)
 * - URL resolution for stored media values
 * - transforming media fields between frontend (URLs) and storage ({ key, bucket }) formats
 * - deleting files from buckets
 */
export class MediaManager {
	private _adapters: Map<string, MediaAdapter> = new Map();
	private _defaultAdapterName?: string;
	private _defaultLocalAdapter?: LocalMediaAdapter;

	/**
	 * Register media adapters, replacing any previously registered ones.
	 * Returns the static mounts that LocalMediaAdapters need (the caller registers
	 * them with the HTTP adapter, keeping this class HTTP-agnostic).
	 */
	register(adapters: MediaAdapter[]): StaticMount[] {
		this._adapters.clear();
		this._defaultAdapterName = undefined;
		const staticMounts: StaticMount[] = [];

		for (const adapter of adapters) {
			const name = adapter.getName();
			this._adapters.set(name, adapter);

			// Set first adapter with isDefault() === true as default
			if (!this._defaultAdapterName && adapter.isDefault()) {
				this._defaultAdapterName = name;
			}

			// LocalMediaAdapter needs its upload directory served statically
			if (adapter instanceof LocalMediaAdapter) {
				const config = (adapter as any).config;
				if (config && config.uploadPath && config.publicUrl) {
					// Extract the path from publicUrl
					// Handle both full URLs (http://localhost:3001/uploads) and paths (/uploads)
					let staticPath = '/uploads';
					try {
						const url = new URL(config.publicUrl);
						staticPath = url.pathname || '/uploads';
					} catch {
						// If publicUrl is not a full URL, treat it as a path
						staticPath = config.publicUrl.startsWith('/') ? config.publicUrl : `/${config.publicUrl}`;
					}
					staticPath = staticPath.replace(/\/$/, '') || '/uploads';
					staticMounts.push({ path: staticPath, directory: config.uploadPath });
				}
			}
		}

		// If no adapter marked as default, use the first one
		if (!this._defaultAdapterName && adapters.length > 0) {
			this._defaultAdapterName = adapters[0].getName();
		}

		return staticMounts;
	}

	/**
	 * Get the media adapter by name, or return the default adapter
	 */
	getAdapter(name?: string): MediaAdapter | undefined {
		if (name) {
			return this._adapters.get(name);
		}
		if (this._defaultAdapterName) {
			return this._adapters.get(this._defaultAdapterName);
		}
		return undefined;
	}

	/**
	 * Get the default adapter name
	 */
	getDefaultAdapterName(): string | undefined {
		return this._defaultAdapterName;
	}

	/**
	 * Get or create the default local media adapter (fallback when none registered)
	 */
	getOrCreateDefaultAdapter(): MediaAdapter {
		const defaultAdapter = this.getAdapter();
		if (defaultAdapter) {
			return defaultAdapter;
		}

		if (!this._defaultLocalAdapter) {
			this._defaultLocalAdapter = new LocalMediaAdapter({
				name: 'local',
				uploadPath: path.join(process.cwd(), 'uploads'),
				publicUrl: '/uploads',
				createDirectories: true,
				isDefault: true,
			});
			this._adapters.set('local', this._defaultLocalAdapter);
			this._defaultAdapterName = 'local';
		}
		return this._defaultLocalAdapter;
	}

	/**
	 * Resolve media URL from media value (string, object with url, or object with key/bucket)
	 */
	async resolveUrl(mediaValue: any): Promise<string | undefined> {
		if (!mediaValue) return undefined;

		// If it's already a URL string, return it
		if (typeof mediaValue === 'string') {
			return mediaValue;
		}

		// If it's an object with url property, return it
		if (mediaValue.url) {
			return mediaValue.url;
		}

		// If it's an object with key and bucket, use adapter to get URL
		if (mediaValue.key && mediaValue.bucket) {
			const adapter = this.getAdapter(mediaValue.bucket);
			if (adapter) {
				return await adapter.getUrl(mediaValue.key);
			}
		}

		// If it's an object with just key, use default adapter
		if (mediaValue.key) {
			const adapter = this.getAdapter();
			if (adapter) {
				return await adapter.getUrl(mediaValue.key);
			}
		}

		return undefined;
	}

	/**
	 * Format a single media key for database bucket
	 * @param key - The media key (e.g., "uploads-test/test/file.png")
	 * @param bucketName - Optional bucket adapter name (defaults to default adapter)
	 * @returns Formatted media object: { key, bucket }
	 */
	async formatKey(key: string, bucketName?: string): Promise<{ key: string; bucket: string }> {
		if (!key) {
			throw new Error('Media key is required');
		}

		const mediaAdapter = bucketName ? this.getAdapter(bucketName) : this.getAdapter();

		if (!mediaAdapter) {
			// Fallback: return basic format with default bucket name
			return {
				key,
				bucket: bucketName || 'default',
			};
		}

		// Use adapter's formatData method to get proper format
		const formatted = await mediaAdapter.formatData(
			{ key, url: await mediaAdapter.getUrl(key) },
			{ fieldName: '', isArray: false },
		);

		return formatted;
	}

	/**
	 * Transform media fields to storage format (create operation)
	 */
	async transformFieldsForStorage(data: Record<string, any>, formSchema: SerializedForm): Promise<void> {
		const fileUploadFields = getFileUploadFields(formSchema.components || []);

		for (const fieldName of fileUploadFields) {
			const fieldValue = data[fieldName];

			// Skip null/undefined
			if (fieldValue === null || fieldValue === undefined) {
				continue;
			}

			const fieldConfig = findFieldConfigByName(fieldName, formSchema.components || []);
			const bucketName = fieldConfig?.bucket;
			const mediaAdapter = bucketName ? this.getAdapter(bucketName) : this.getAdapter();

			if (mediaAdapter) {
				if (Array.isArray(fieldValue)) {
					data[fieldName] = await Promise.all(
						fieldValue.map(async (key: string) => {
							return mediaAdapter.formatData(
								{ key, url: await mediaAdapter.getUrl(key) },
								{ fieldName, isArray: true },
							);
						}),
					);
				} else if (typeof fieldValue === 'string') {
					data[fieldName] = await mediaAdapter.formatData(
						{ key: fieldValue, url: await mediaAdapter.getUrl(fieldValue) },
						{ fieldName, isArray: false },
					);
				}
			}
		}
	}

	/**
	 * Transform media fields for update (preserves existing bucket, uses current adapter for new files)
	 */
	async transformFieldsForUpdate(
		data: Record<string, any>,
		existingRecord: Record<string, any>,
		formSchema: any,
		fileUploadFields: string[],
	): Promise<void> {
		for (const fieldName of fileUploadFields) {
			const fieldValue = data[fieldName];

			// Skip undefined (no change) or null (cleared)
			if (fieldValue === undefined) {
				delete data[fieldName];
				continue;
			}

			if (fieldValue === null) {
				continue;
			}

			const fieldConfig = findFieldConfigByName(fieldName, formSchema.components || []);
			const bucketName = fieldConfig?.bucket;
			const defaultAdapter = bucketName ? this.getAdapter(bucketName) : this.getAdapter();

			if (!defaultAdapter) continue;

			const existingValue = existingRecord[fieldName];

			if (Array.isArray(fieldValue)) {
				data[fieldName] = await Promise.all(
					fieldValue.map(async (key: string) => {
						const existingMedia = findExistingMediaByKey(key, existingValue);

						if (existingMedia) {
							// Preserve existing bucket information
							return { key: existingMedia.key, bucket: existingMedia.bucket };
						} else {
							// New file - use current adapter
							return defaultAdapter.formatData(
								{ key, url: await defaultAdapter.getUrl(key) },
								{ fieldName, isArray: true },
							);
						}
					}),
				);
			} else if (typeof fieldValue === 'string') {
				const existingMedia = findExistingMediaByKey(fieldValue, existingValue);

				if (existingMedia) {
					data[fieldName] = { key: existingMedia.key, bucket: existingMedia.bucket };
				} else {
					data[fieldName] = await defaultAdapter.formatData(
						{ key: fieldValue, url: await defaultAdapter.getUrl(fieldValue) },
						{ fieldName, isArray: false },
					);
				}
			}
		}
	}

	/**
	 * Transform media field values to URLs for frontend consumption
	 * Uses the media adapter's resolveFieldUrls method with adapter lookup
	 */
	async transformFieldsToUrls(data: any, schema: any, schemaType: 'form' | 'table'): Promise<any> {
		if (!data) {
			return data;
		}

		// Get media field names based on schema type
		let mediaFields: string[] = [];
		if (schemaType === 'form') {
			if (!schema?.components) {
				return data;
			}
			mediaFields = getFileUploadFields(schema.components);
		} else {
			// table schema
			mediaFields = getMediaFieldsFromTableSchema(schema);
		}

		if (mediaFields.length === 0) {
			return data;
		}

		// Clone the data to avoid mutating the original
		const result = { ...data };

		// Adapter lookup function
		const getAdapterByName = (name: string) => this.getAdapter(name);

		// Get default adapter for fallback
		const defaultAdapter = this.getAdapter();

		for (const fieldName of mediaFields) {
			const fieldValue = result[fieldName];

			if (!fieldValue) continue;

			// Use the adapter's resolveFieldUrls method with adapter lookup
			if (defaultAdapter) {
				result[fieldName] = await defaultAdapter.resolveFieldUrls(fieldValue, fieldName, getAdapterByName);
			}
		}

		return result;
	}

	/**
	 * Delete media files from their buckets
	 */
	async deleteFiles(files: MediaFileInfo[]): Promise<void> {
		if (files.length === 0) return;

		await Promise.all(
			files.map(async ({ key, bucket }) => {
				try {
					const adapter = bucket ? this.getAdapter(bucket) : this.getAdapter();
					if (adapter) {
						await adapter.delete(key);
					}
				} catch (err) {
					console.warn(`Failed to delete file ${key} from bucket ${bucket || 'default'}:`, err);
				}
			}),
		);
	}
}
