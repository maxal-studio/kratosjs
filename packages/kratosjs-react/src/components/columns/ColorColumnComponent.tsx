import React from 'react';
import { ColumnProps } from './TextColumnComponent';
import { formatValue } from '../../utils/tableFormatters';

export function ColorColumnComponent({ column, record }: ColumnProps) {
	const rawValue = record[column.name];
	// Apply formatter if present
	const value = formatValue(rawValue, column, record);

	if (!value) {
		return <span className="text-fg-secondary">-</span>;
	}

	return (
		<div className="flex items-center gap-2">
			<div
				className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
				style={{ backgroundColor: value }}
			/>
			<span className="text-sm text-fg-secondary font-mono">{value}</span>
		</div>
	);
}
