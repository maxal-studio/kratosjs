/**
 * Media Helper Types & Functions
 * Utilities for working with media file data structures
 */

export interface MediaFileInfo {
	key: string;
	bucket: string;
}

/**
 * Extract keys from a media field value (handles old string format and new object format)
 */
export function extractMediaKeys(value: any): string[] {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value.map((item: any) => {
			if (typeof item === 'object' && item.key) {
				return item.key;
			}
			return String(item);
		});
	}
	if (typeof value === 'object' && value.key) {
		return [value.key];
	}
	if (typeof value === 'string') {
		return [value];
	}
	return [];
}

/**
 * Extract media files with bucket info from a field value
 */
export function extractMediaFilesWithStorage(value: any, fallbackStorage: string = ''): MediaFileInfo[] {
	const files: MediaFileInfo[] = [];
	if (!value) return files;

	if (Array.isArray(value)) {
		value.forEach((item: any) => {
			if (typeof item === 'object' && item.key) {
				files.push({
					key: item.key,
					bucket: item.bucket || fallbackStorage,
				});
			} else if (typeof item === 'string') {
				files.push({
					key: item,
					bucket: fallbackStorage,
				});
			}
		});
	} else if (typeof value === 'object' && value.key) {
		files.push({
			key: value.key,
			bucket: value.bucket || fallbackStorage,
		});
	} else if (typeof value === 'string') {
		files.push({
			key: value,
			bucket: fallbackStorage,
		});
	}

	return files;
}

/**
 * Get bucket for a specific key from an existing media value
 */
export function getStorageForMediaKey(key: string, existingValue: any): string | null {
	if (!existingValue) return null;

	if (Array.isArray(existingValue)) {
		const found = existingValue.find((item: any) => {
			if (typeof item === 'object' && item.key) {
				return item.key === key;
			}
			return String(item) === key;
		});
		if (found && typeof found === 'object' && found.bucket) {
			return found.bucket;
		}
	} else if (typeof existingValue === 'object' && existingValue.key === key && existingValue.bucket) {
		return existingValue.bucket;
	}

	return null;
}

/**
 * Find existing media info by key
 */
export function findExistingMediaByKey(key: string, existingValue: any): MediaFileInfo | null {
	if (!existingValue) return null;

	if (Array.isArray(existingValue)) {
		const found = existingValue.find((item: any) => {
			if (typeof item === 'object' && item.key) {
				return item.key === key;
			}
			return String(item) === key;
		});
		if (found && typeof found === 'object' && found.key && found.bucket) {
			return { key: found.key, bucket: found.bucket };
		}
	} else if (typeof existingValue === 'object' && existingValue.key === key && existingValue.bucket) {
		return { key: existingValue.key, bucket: existingValue.bucket };
	}

	return null;
}
