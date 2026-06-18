/**
 * Result returned after a successful media upload
 */
export interface MediaUploadResult {
	/** The bucket key/path for the uploaded file */
	key: string;
	/** Public URL if available */
	url?: string;
	/** Additional metadata from the upload */
	metadata?: Record<string, any>;
	/** Optional variants (e.g., thumbnails) */
	variants?: Record<string, { key: string; bucket?: string }>;
}

/**
 * Options for uploading media files
 */
export interface MediaUploadOptions {
	/** Directory path within bucket */
	path?: string;
	/** Custom filename (without extension) */
	filename?: string;
	/** MIME type of the file */
	contentType?: string;
	/** Additional metadata to store */
	metadata?: Record<string, any>;
	/** Visibility setting */
	visibility?: 'public' | 'private';
	/** Additional provider-specific options */
	[key: string]: any;
}

/**
 * Options for deleting media files
 */
export interface MediaDeleteOptions {
	/** Additional provider-specific options */
	[key: string]: any;
}

/**
 * Options for generating media URLs
 */
export interface MediaUrlOptions {
	/** Expiration time in seconds for signed URLs */
	expiresIn?: number;
	/** Additional provider-specific options */
	[key: string]: any;
}

/**
 * Context provided to formatData for customization
 */
export interface MediaFormatContext {
	/** Name of the form field */
	fieldName: string;
	/** ID of the record being updated (if editing) */
	recordId?: string;
	/** Whether the field accepts multiple files */
	isArray?: boolean;
	/** Existing value of the field (for appending to arrays) */
	existingValue?: any;
	/** Resource slug */
	resourceSlug?: string;
	/** Additional context data */
	[key: string]: any;
}

/**
 * Resolved media value for frontend consumption
 * Contains URL (for display), key (for deletion), and bucket name
 */
export interface ResolvedMediaValue {
	/** URL for displaying the media */
	url: string;
	/** Storage key for deletion */
	key: string;
	/** Storage adapter name */
	bucket: string;
	/** Optional variants (e.g., thumbnails) */
	variants?: Record<string, ResolvedMediaValue>;
}

/**
 * Abstract base class for media bucket adapters
 *
 * Extend this class to implement custom bucket providers (S3, local, GCS, etc.)
 */
export abstract class MediaAdapter<TConfig = Record<string, any>> {
	protected config: TConfig;
	protected _isDefault: boolean = false;

	constructor(config: TConfig, options?: { isDefault?: boolean }) {
		this.config = config;
		this._isDefault = options?.isDefault || false;
	}

	/**
	 * Get the unique name/identifier for this adapter
	 * @returns Adapter name (e.g., 'local', 's3', 'gcs')
	 */
	abstract getName(): string;

	/**
	 * Check if this adapter is the default adapter
	 * @returns true if this is the default adapter
	 */
	isDefault(): boolean {
		return this._isDefault;
	}

	/**
	 * Upload a file to bucket
	 * @param file - File buffer or readable stream
	 * @param options - Upload options
	 * @returns Upload result with key and optional URL
	 */
	abstract upload(file: Buffer | NodeJS.ReadableStream, options?: MediaUploadOptions): Promise<MediaUploadResult>;

	/**
	 * Delete a file from bucket
	 * @param key - The bucket key of the file to delete
	 * @param options - Delete options
	 */
	abstract delete(key: string, options?: MediaDeleteOptions): Promise<void>;

	/**
	 * Get a URL for accessing the file
	 * @param key - The bucket key of the file
	 * @param options - URL generation options (e.g., expiration for signed URLs)
	 * @returns The URL to access the file
	 */
	abstract getUrl(key: string, options?: MediaUrlOptions): Promise<string>;

	/**
	 * Get the provider name identifier
	 * @returns Provider name (e.g., 's3', 'local', 'gcs')
	 */
	abstract getProviderName(): string;

	/**
	 * Format the upload result for database bucket
	 * Always returns standardized format: { key, bucket, variants? }
	 *
	 * @param result - The upload result
	 * @param context - Context about the upload (field name, record ID, etc.)
	 * @returns Data to store in the database: { key, bucket, variants? }
	 */
	async formatData(result: MediaUploadResult, _context?: MediaFormatContext): Promise<any> {
		return {
			key: result.key,
			bucket: this.getName(),
			...(result.variants ? { variants: result.variants } : {}),
		};
	}

	/**
	 * Resolve a field value from the database to { url, key, bucket } for frontend consumption
	 *
	 * @param fieldValue - The raw field value from the database
	 * @param fieldName - The name of the field (for context)
	 * @param getAdapterByName - Function to look up adapter by bucket name
	 * @returns ResolvedMediaValue with url, key, bucket, and variants, or array/null
	 */
	async resolveFieldUrls(
		fieldValue: any,
		_fieldName?: string,
		getAdapterByName?: (name: string) => MediaAdapter<any> | undefined,
	): Promise<any> {
		if (!fieldValue) return null;

		// Handle array of values
		if (Array.isArray(fieldValue)) {
			return Promise.all(fieldValue.map(item => this.resolveSingleValue(item, getAdapterByName)));
		}

		// Handle single value
		return this.resolveSingleValue(fieldValue, getAdapterByName);
	}

	/**
	 * Resolve a single stored value to { url, key, bucket, variants? } for frontend
	 *
	 * @param value - The stored value (object with { key, bucket } or string key)
	 * @param getAdapterByName - Function to look up adapter by bucket name
	 * @returns Resolved value with url, key, bucket, and variants
	 */
	protected async resolveSingleValue(
		value: any,
		getAdapterByName?: (name: string) => MediaAdapter<any> | undefined,
	): Promise<any> {
		// Handle new format: { key, bucket, variants? }
		if (value && typeof value === 'object' && value.key && value.bucket) {
			const bucketName = value.bucket;
			const adapter = getAdapterByName ? getAdapterByName(bucketName) : this;

			if (!adapter) {
				console.warn(`Media adapter "${bucketName}" not found`);
				return null;
			}

			const url = await adapter.getUrl(value.key);

			const result: any = {
				key: value.key,
				bucket: bucketName,
				url,
			};

			// Resolve variants if present
			if (value.variants && typeof value.variants === 'object') {
				result.variants = {};
				for (const [variantName, variantData] of Object.entries(value.variants)) {
					if (variantData && typeof variantData === 'object' && 'key' in variantData) {
						const variantStorage = (variantData as any).bucket || bucketName;
						const variantAdapter = getAdapterByName ? getAdapterByName(variantStorage) : adapter;
						if (variantAdapter) {
							const variantUrl = await variantAdapter.getUrl((variantData as any).key);
							result.variants[variantName] = {
								key: (variantData as any).key,
								bucket: variantStorage,
								url: variantUrl,
							};
						}
					}
				}
			}

			return result;
		}

		// String form: a bare storage key (assume current adapter)
		const key = String(value);
		const url = await this.getUrl(key);
		return {
			key,
			bucket: this.getName(),
			url,
		};
	}

	/**
	 * Generate a unique filename with timestamp and random suffix
	 * @param originalFilename - Original filename
	 * @returns Unique filename
	 */
	protected generateUniqueFilename(originalFilename: string): string {
		const timestamp = Date.now();
		const randomSuffix = Math.random().toString(36).substring(2, 10);
		const ext = originalFilename.includes('.') ? originalFilename.split('.').pop() : '';
		const baseName = originalFilename.includes('.')
			? originalFilename.substring(0, originalFilename.lastIndexOf('.'))
			: originalFilename;

		// Sanitize the base name
		const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);

		return ext
			? `${sanitizedBaseName}-${timestamp}-${randomSuffix}.${ext}`
			: `${sanitizedBaseName}-${timestamp}-${randomSuffix}`;
	}

	/**
	 * Build the full bucket key from path and filename
	 * @param options - Upload options containing path
	 * @param filename - The filename
	 * @returns Full bucket key
	 */
	protected buildStorageKey(options: MediaUploadOptions | undefined, filename: string): string {
		const path = options?.path?.replace(/^\/|\/$/g, '') || '';
		return path ? `${path}/${filename}` : filename;
	}
}
