import {
	S3Client,
	PutObjectCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
	MediaAdapter,
	MediaUploadResult,
	MediaUploadOptions,
	MediaDeleteOptions,
	MediaUrlOptions,
} from './MediaAdapter';

/**
 * Configuration for S3MediaAdapter
 */
export interface S3MediaAdapterConfig {
	/** Unique name for this adapter instance (e.g., 's3-images', 's3-videos', 'minio') */
	name: string;
	/** S3 bucket name */
	bucket: string;
	/** AWS region */
	region: string;
	/** Path prefix for all uploads (e.g., 'uploads', 'images', 'videos') */
	uploadPath: string;
	/** AWS access key ID */
	accessKeyId?: string;
	/** AWS secret access key */
	secretAccessKey?: string;
	/** Custom S3 endpoint (for S3-compatible services like MinIO, DigitalOcean Spaces) */
	endpoint?: string;
	/** Public URL base for accessing files (if different from S3 URL) */
	publicUrl?: string;
	/** Force path style URLs (required for some S3-compatible services) */
	forcePathStyle?: boolean;
	/** Default visibility for uploads */
	defaultVisibility?: 'public' | 'private';
	/** Default expiration time for signed URLs (in seconds) */
	signedUrlExpiration?: number;
	/** Whether this adapter is the default */
	isDefault?: boolean;
}

/**
 * S3 Media Adapter for AWS S3 and S3-compatible storage services
 *
 * @example
 * ```typescript
 * // Simple usage - each adapter needs a unique name
 * const s3Adapter = new S3MediaAdapter({
 *   name: 's3-main',
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
 *   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
 * });
 *
 * // Multiple S3 adapters with different configurations
 * const s3Images = new S3MediaAdapter({
 *   name: 's3-images',
 *   bucket: 'images-bucket',
 *   region: 'us-east-1',
 *   isDefault: true, // Set as default
 * });
 *
 * const s3Videos = new S3MediaAdapter({
 *   name: 's3-videos',
 *   bucket: 'videos-bucket',
 *   region: 'us-east-1',
 * });
 *
 * // For MinIO or other S3-compatible services:
 * const minioAdapter = new S3MediaAdapter({
 *   name: 'minio',
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   endpoint: 'http://localhost:9000',
 *   forcePathStyle: true,
 *   accessKeyId: 'minioadmin',
 *   secretAccessKey: 'minioadmin',
 * });
 *
 * // Register all adapters
 * panel.mediaAdapters([s3Images, s3Videos, minioAdapter]);
 * ```
 */
export class S3MediaAdapter extends MediaAdapter<S3MediaAdapterConfig> {
	private client: S3Client;
	private _name: string;

	constructor(config: S3MediaAdapterConfig) {
		// Pass isDefault to base class
		super(config, {
			isDefault: config.isDefault || false,
		});
		this._name = config.name;

		const clientConfig: any = {
			region: config.region,
		};

		// Add credentials if provided
		if (config.accessKeyId && config.secretAccessKey) {
			clientConfig.credentials = {
				accessKeyId: config.accessKeyId,
				secretAccessKey: config.secretAccessKey,
			};
		}

		// Add custom endpoint for S3-compatible services
		if (config.endpoint) {
			clientConfig.endpoint = config.endpoint;
		}

		// Force path style for S3-compatible services
		if (config.forcePathStyle) {
			clientConfig.forcePathStyle = true;
		}

		this.client = new S3Client(clientConfig);
	}

	/**
	 * Upload a file to S3
	 */
	async upload(file: Buffer | NodeJS.ReadableStream, options?: MediaUploadOptions): Promise<MediaUploadResult> {
		const originalFilename = options?.filename || 'file';
		const uniqueFilename = this.generateUniqueFilename(originalFilename);

		// Build the key with uploadPath prefix
		// The key saved in the database should be uploadPath/filename
		let key = this.buildStorageKey(options, uniqueFilename);
		// Add uploadPath prefix to the key
		const uploadPathPrefix = this.config.uploadPath.replace(/^\/|\/$/g, '');
		if (uploadPathPrefix) {
			key = `${uploadPathPrefix}/${key}`;
		}

		// Determine ACL based on visibility
		const visibility = options?.visibility || this.config.defaultVisibility || 'private';
		const acl = visibility === 'public' ? 'public-read' : 'private';

		// Ensure we have a Buffer for S3 upload
		const body = Buffer.isBuffer(file) ? file : file;

		// Build the put command
		const commandInput: PutObjectCommandInput = {
			Bucket: this.config.bucket,
			Key: key,
			Body: body as Buffer,
			ACL: acl,
		};

		// Add content type if provided
		if (options?.contentType) {
			commandInput.ContentType = options.contentType;
		}

		// Add metadata if provided
		if (options?.metadata) {
			commandInput.Metadata = Object.fromEntries(
				Object.entries(options.metadata).map(([k, v]) => [k, String(v)]),
			);
		}

		// Upload to S3
		await this.client.send(new PutObjectCommand(commandInput));

		// Generate URL
		const url = await this.getUrl(key, { visibility });

		return {
			key,
			url,
			metadata: {
				bucket: this.config.bucket,
				contentType: options?.contentType,
				visibility,
			},
		};
	}

	/**
	 * Delete a file from S3
	 */
	async delete(key: string, _options?: MediaDeleteOptions): Promise<void> {
		await this.client.send(
			new DeleteObjectCommand({
				Bucket: this.config.bucket,
				Key: key,
			}),
		);
	}

	/**
	 * Get URL for accessing the file
	 * Returns a signed URL for private files, direct URL for public files
	 */
	async getUrl(key: string, options?: MediaUrlOptions & { visibility?: string }): Promise<string> {
		// If public URL is configured, use it
		if (this.config.publicUrl) {
			return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
		}

		// For public files, return direct S3 URL
		if (options?.visibility === 'public') {
			if (this.config.endpoint) {
				// S3-compatible service
				const baseUrl = this.config.endpoint.replace(/\/$/, '');
				if (this.config.forcePathStyle) {
					return `${baseUrl}/${this.config.bucket}/${key}`;
				}
				return `${baseUrl}/${key}`;
			}
			// Standard S3 URL
			return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
		}

		// For private files, generate signed URL
		const expiresIn = options?.expiresIn || this.config.signedUrlExpiration || 3600;
		const command = new GetObjectCommand({
			Bucket: this.config.bucket,
			Key: key,
		});

		return getSignedUrl(this.client, command, { expiresIn });
	}

	/**
	 * Get provider name
	 */
	getProviderName(): string {
		return 's3';
	}

	/**
	 * Get the unique name for this adapter
	 */
	getName(): string {
		return this._name;
	}

	/**
	 * Get the S3 client instance for advanced operations
	 */
	getClient(): S3Client {
		return this.client;
	}

	/**
	 * Get the bucket name
	 */
	getBucket(): string {
		return this.config.bucket;
	}
}
