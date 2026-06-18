import { TableBuilder } from '../tablebuilder';
import { FormBuilder } from '../formbuilder';

/**
 * Apply column formatters to records
 * @param records - Array of records to format
 * @param tableBuilder - TableBuilder instance with column formatters
 * @returns Formatted records array
 */
export async function applyColumnFormatters(records: any[], tableBuilder: TableBuilder): Promise<any[]> {
	if (!records || records.length === 0) {
		return records;
	}

	const columns = tableBuilder.getColumns();
	const columnsWithFormatters = columns.filter((col: any) => col.hasFormatter());

	if (columnsWithFormatters.length === 0) {
		return records;
	}

	return Promise.all(
		records.map(async (record: any) => {
			const formattedRecord = { ...record };
			for (const column of columnsWithFormatters) {
				const columnName = column.getName();
				const value = formattedRecord[columnName];
				const formatter = column.getFormatter();
				if (formatter) {
					formattedRecord[columnName] = await formatter(value, formattedRecord);
				}
			}
			return formattedRecord;
		}),
	);
}

/**
 * Recursively apply field formatters to a record using a list of form components.
 * Handles Section, Group, Tabs (inner schemas at same record level) and Repeater (array of sub-records).
 * @param record - Record or sub-record to format (mutated in place)
 * @param components - Form components (may include Section, Group, Tabs, Repeater, or fields)
 */
async function applyFieldFormattersToComponents(record: any, components: any[]): Promise<void> {
	if (!record || !components?.length) return;

	for (const comp of components) {
		const childScope = comp.getChildScope?.();

		// Array-scope container (Repeater): record[name] is an array of sub-records.
		if (childScope === 'array' && comp.getName?.()) {
			const arr = record[comp.getName()];
			if (Array.isArray(arr)) {
				const innerSchema = comp.getChildComponents?.() ?? [];
				for (const item of arr) {
					await applyFieldFormattersToComponents(item, innerSchema);
				}
			}
			continue;
		}

		// Layout containers (Section / Group / Tabs / Tab): inner fields share the record level.
		const children = comp.getChildComponents?.() ?? [];
		if (children.length > 0) {
			await applyFieldFormattersToComponents(record, children);
			continue;
		}

		// Field with formatter
		if (comp.hasFormatter?.() && comp.getName?.()) {
			const name = comp.getName();
			const formatter = comp.getFormatter?.();
			if (formatter) {
				record[name] = await formatter(record[name], record);
			}
		}
	}
}

/**
 * Apply field formatters to a record, including fields inside Section, Group, Tabs, and Repeater.
 * @param record - Record to format
 * @param formBuilder - FormBuilder instance with field formatters
 * @returns Formatted record
 */
export async function applyFieldFormatters(record: any, formBuilder: FormBuilder): Promise<any> {
	if (!record) {
		return record;
	}

	const components = formBuilder.getComponents();
	if (!components?.length) {
		return record;
	}

	const formattedRecord = { ...record };
	await applyFieldFormattersToComponents(formattedRecord, components);
	return formattedRecord;
}
