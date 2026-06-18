import { SerializedTable } from '../tablebuilder/types';
import { ValidationError } from '../resource/types';

/**
 * Validates data against table schemas
 */
export class TableValidator {
	/**
	 * Filter records to only include columns declared in table schema
	 * Also includes any extra fields defined via extraFields()
	 */
	static filterColumns(schema: SerializedTable, records: any[]): any[] {
		const allowedColumns = schema.columns.map(col => col.name);

		// Include extra fields if defined (for formatStateUsing functions)
		const extraFields = (schema.extraFields as string[]) || [];
		const allAllowedFields = [...allowedColumns, ...extraFields];

		return records.map(record => {
			const filtered: any = {};

			for (const field of allAllowedFields) {
				if (record[field] !== undefined) {
					filtered[field] = record[field];
				}
			}

			// Always include _id if present (MongoDB)
			if (record._id) {
				filtered._id = record._id;
			}
			if (record.id) {
				filtered.id = record.id;
			}

			return filtered;
		});
	}

	/**
	 * Validate that only editable columns are being updated
	 */
	static validateEditableColumns(schema: SerializedTable, data: any): any {
		const editableColumns = this.getEditableColumns(schema);
		const filtered: any = {};

		for (const [key, value] of Object.entries(data)) {
			if (editableColumns.includes(key)) {
				filtered[key] = value;
			} else {
				// Attempting to update a read-only column
				throw new ValidationError(`Column "${key}" is not editable`, key, 'readonly');
			}
		}

		return filtered;
	}

	/**
	 * Get list of editable column names
	 */
	static getEditableColumns(schema: SerializedTable): string[] {
		const editableTypes = ['textinput', 'select', 'checkbox', 'toggle'];

		return schema.columns.filter(col => editableTypes.includes(col.type)).map(col => col.name);
	}

	/**
	 * Validate column values based on column type
	 */
	static validateColumnValues(schema: SerializedTable, data: any): void {
		for (const [key, value] of Object.entries(data)) {
			const column = schema.columns.find(col => col.name === key);

			if (!column) {
				continue;
			}

			// Skip null/undefined values
			if (value === null || value === undefined) {
				continue;
			}

			// Validate based on column type
			switch (column.type) {
				case 'textinput':
					if (typeof value !== 'string') {
						throw new ValidationError(
							`Column "${column.label || column.name}" must be a string`,
							column.name,
							'type',
						);
					}
					break;

				case 'checkbox':
				case 'toggle':
					if (typeof value !== 'boolean') {
						throw new ValidationError(
							`Column "${column.label || column.name}" must be a boolean`,
							column.name,
							'type',
						);
					}
					break;

				case 'select':
					// Validate against options if provided
					if (column.options) {
						const validOptions = Object.keys(column.options);
						if (!validOptions.includes(String(value))) {
							throw new ValidationError(
								`Column "${column.label || column.name}" must be one of: ${validOptions.join(', ')}`,
								column.name,
								'invalid_option',
							);
						}
					}
					break;
			}
		}
	}
}
