import React, { useState, useEffect } from 'react';
import { ColumnProps } from './TextColumnComponent';

export interface EditableColumnProps extends ColumnProps {
	onCellChange?: (value: any) => void;
}

export function CheckboxColumnComponent({ column, record, onCellChange }: EditableColumnProps) {
	const [value, setValue] = useState(Boolean(record[column.name]));
	const isDisabled = column.disabled;

	// Update local value when record changes (e.g., after reset)
	useEffect(() => {
		setValue(Boolean(record[column.name]));
	}, [record[column.name]]);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (isDisabled) return;

		const newValue = e.target.checked;
		setValue(newValue);

		// Notify parent of change
		if (onCellChange) {
			onCellChange(newValue);
		}
	};

	return (
		<input
			type="checkbox"
			checked={value}
			onChange={handleChange}
			disabled={isDisabled}
			className="w-4 h-4 text-accent bg-gray-100 border-gray-300 rounded focus:ring-ring dark:focus:ring-ring dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	);
}
