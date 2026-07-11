import { ResourceHooks } from '../resource/types';
import { MediaHooks } from '../panel/PanelHooks';
import { traverseComponent } from './formSchemaTraversal';
import { MediaFileInfo, extractMediaKeys, extractMediaFilesWithStorage, getStorageForMediaKey } from './mediaHelpers';

/**
 * Merge two hook configurations
 * Arrays are concatenated, not replaced
 */
export function mergeHooks(existing: ResourceHooks, newHooks: ResourceHooks): ResourceHooks {
	const merged: ResourceHooks = {};
	const allEvents = new Set([...Object.keys(existing), ...Object.keys(newHooks)]) as Set<keyof ResourceHooks>;

	for (const event of allEvents) {
		const existingHandlers = existing[event] || [];
		const newHandlers = newHooks[event] || [];
		merged[event] = [
			...(Array.isArray(existingHandlers) ? existingHandlers : [existingHandlers]),
			...(Array.isArray(newHandlers) ? newHandlers : [newHandlers]),
		];
	}

	return { ...existing, ...merged };
}

/**
 * Merge two media hook configurations.
 * Arrays are concatenated, not replaced (the media analog of mergeHooks).
 */
export function mergeMediaHooks(existing: MediaHooks, newHooks: MediaHooks): MediaHooks {
	const merged: MediaHooks = {};
	const allEvents = new Set([...Object.keys(existing), ...Object.keys(newHooks)]) as Set<keyof MediaHooks>;

	for (const event of allEvents) {
		merged[event] = [...(existing[event] || []), ...(newHooks[event] || [])];
	}

	return { ...existing, ...merged };
}

/**
 * Recursively collect file upload field names from form schema components.
 * Handles nested layout components (Section, Group, Tabs, Repeater).
 */
export function getFileUploadFields(components: any[]): string[] {
	const fields: string[] = [];

	for (const component of components) {
		traverseComponent(component, nested => {
			if ((nested as any).type === 'fileUpload' && (nested as any).name) {
				fields.push((nested as any).name as string);
			}
		});
	}

	return fields;
}

/**
 * Get media field names from table schema
 */
export function getMediaFieldsFromTableSchema(tableSchema: any): string[] {
	if (!tableSchema?.columns) {
		return [];
	}

	const fields: string[] = [];
	for (const column of tableSchema.columns) {
		if (column.type === 'image' || column.type === 'video' || column.type === 'media') {
			fields.push(column.name);
		}
	}

	return fields;
}

/**
 * Detect media files that need to be deleted (update operation)
 * Compares incoming data with existing record to find files that were removed
 */
export function detectDeletedMediaFiles(
	incomingData: Record<string, any>,
	existingRecord: Record<string, any>,
	fileUploadFields: string[],
): MediaFileInfo[] {
	const filesToDelete: MediaFileInfo[] = [];

	for (const fieldName of fileUploadFields) {
		const existingValue = existingRecord[fieldName];
		const incomingValue = incomingData[fieldName];

		// Skip if field is undefined (no change)
		if (incomingValue === undefined) {
			continue;
		}

		if (incomingValue === null) {
			// Field cleared - all existing files should be deleted
			const existingKeys = extractMediaKeys(existingValue);
			existingKeys.forEach(key => {
				const bucket = getStorageForMediaKey(key, existingValue);
				if (bucket) {
					filesToDelete.push({ key, bucket });
				}
			});
			continue;
		}

		// Compare existing vs incoming to find deleted files
		const existingKeys = extractMediaKeys(existingValue);
		const incomingKeys = extractMediaKeys(incomingValue);
		const deletedKeys = existingKeys.filter(key => !incomingKeys.includes(key));

		deletedKeys.forEach(key => {
			const bucket = getStorageForMediaKey(key, existingValue);
			if (bucket) {
				filesToDelete.push({ key, bucket });
			}
		});
	}

	return filesToDelete;
}

/**
 * Collect all media files from multiple records
 */
export function collectMediaFilesFromRecords(records: (any | null)[], fileUploadFields: string[]): MediaFileInfo[] {
	const files: MediaFileInfo[] = [];

	for (const record of records) {
		if (!record) continue;

		for (const fieldName of fileUploadFields) {
			const fieldValue = record[fieldName];
			if (fieldValue) {
				files.push(...extractMediaFilesWithStorage(fieldValue));
			}
		}
	}

	return files;
}

// handleError moved to src/http/errors.ts (framework-neutral); re-exported here
// so existing imports keep working. Express Response satisfies ErrorReplyTarget.
export { handleError } from '../http/errors';
export type { ErrorReplyTarget } from '../http/errors';
