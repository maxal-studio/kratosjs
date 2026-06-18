import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';
import {
	MediaAdapter,
	MediaUploadResult,
	MediaUploadOptions,
	MediaDeleteOptions,
	MediaUrlOptions,
} from './MediaAdapter';

/**
 * Configuration for LocalMediaAdapter
 */
export interface LocalMediaAdapterConfig {
	/** Unique name for this adapter instance (e.g., 'local-uploads', 'local-temp', 'local-public') */
	name: string;
	/** Base directory for file uploads (absolute path) */
	uploadPath: string;
	/** Public URL base for accessing files */
	publicUrl: string;
	/** Create directories recursively if they don't exist */
	createDirectories?: boolean;
	/** Whether this adapter is the default */
	isDefault?: boolean;
}

/**
 * Local File System Media Adapter
 *
 * Stores files on the local file system and serves them via a public URL.
 *
 * @example
 * ```typescript
 * // Simple usage - each adapter needs a unique name
 * const localAdapter = new LocalMediaAdapter({
 *   name: 'local-uploads',
 *   uploadPath: '/var/www/uploads',
 *   publicUrl: 'https://example.com/uploads',
 * });
 *
 * // Multiple local adapters with different directories
 * const uploadsAdapter = new LocalMediaAdapter({
 *   name: 'local-uploads',
 *   uploadPath: '/var/www/uploads',
 *   publicUrl: 'https://example.com/uploads',
 *   isDefault: true, // Set as default
 * });
 *
 * const tempAdapter = new LocalMediaAdapter({
 *   name: 'local-temp',
 *   uploadPath: '/var/www/temp',
 *   publicUrl: 'https://example.com/temp',
 * });
 *
 * // Register all adapters
 * panel.mediaAdapters([uploadsAdapter, tempAdapter]);
 * ```
 */
export class LocalMediaAdapter extends MediaAdapter<LocalMediaAdapterConfig> {
	private _name: string;

	constructor(config: LocalMediaAdapterConfig) {
		const fullConfig = {
			createDirectories: true,
			...config,
		};
		// Pass isDefault to base class
		super(fullConfig, {
			isDefault: config.isDefault || false,
		});
		this._name = config.name;
	}

	/**
	 * Get the unique name for this adapter
	 */
	getName(): string {
		return this._name;
	}

	/**
	 * Upload a file to local storage
	 */
	async upload(file: Buffer | NodeJS.ReadableStream, options?: MediaUploadOptions): Promise<MediaUploadResult> {
		const originalFilename = options?.filename || 'file';
		const uniqueFilename = this.generateUniqueFilename(originalFilename);

		// Build the storage key (relative path for the file)
		// This key is used for both database storage and URL generation
		const key = this.buildStorageKey(options, uniqueFilename);

		// Build the full file path for local storage
		const fullPath = path.join(this.config.uploadPath, key);
		const directory = path.dirname(fullPath);

		// Create directory if needed
		if (this.config.createDirectories) {
			await fs.mkdir(directory, { recursive: true });
		}

		// Write the file
		if (Buffer.isBuffer(file)) {
			await fs.writeFile(fullPath, file);
		} else {
			// Handle readable stream
			await this.writeStream(file as Readable, fullPath);
		}

		// Generate URL
		const url = await this.getUrl(key);

		return {
			key,
			url,
			metadata: {
				path: fullPath,
			},
		};
	}

	/**
	 * Write a readable stream to a file
	 */
	private async writeStream(stream: Readable, filePath: string): Promise<void> {
		const chunks: Buffer[] = [];

		return new Promise((resolve, reject) => {
			stream.on('data', (chunk: Buffer) => chunks.push(chunk));
			stream.on('error', reject);
			stream.on('end', async () => {
				try {
					await fs.writeFile(filePath, Buffer.concat(chunks));
					resolve();
				} catch (err) {
					reject(err);
				}
			});
		});
	}

	/**
	 * Delete a file from local storage
	 */
	async delete(key: string, _options?: MediaDeleteOptions): Promise<void> {
		const fullPath = path.join(this.config.uploadPath, key);

		try {
			await fs.unlink(fullPath);
		} catch (error: any) {
			// Ignore if file doesn't exist
			if (error.code !== 'ENOENT') {
				throw error;
			}
		}
	}

	/**
	 * Get URL for accessing the file
	 */
	async getUrl(key: string, _options?: MediaUrlOptions): Promise<string> {
		const baseUrl = this.config.publicUrl.replace(/\/$/, '');
		return `${baseUrl}/${key}`;
	}

	/**
	 * Get provider name
	 */
	getProviderName(): string {
		return 'local';
	}

	/**
	 * Get the full file path for a key
	 */
	getFilePath(key: string): string {
		return path.join(this.config.uploadPath, key);
	}

	/**
	 * Check if a file exists
	 */
	async exists(key: string): Promise<boolean> {
		const fullPath = path.join(this.config.uploadPath, key);
		try {
			await fs.access(fullPath);
			return true;
		} catch {
			return false;
		}
	}
}
