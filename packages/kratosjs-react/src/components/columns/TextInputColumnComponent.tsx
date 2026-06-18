import React, { useState, useEffect } from 'react';
import { ColumnProps } from './TextColumnComponent';

export interface EditableColumnProps extends ColumnProps {
	onCellChange?: (value: any) => void;
}

export function TextInputColumnComponent({ column, record, onCellChange }: EditableColumnProps) {
	const [value, setValue] = useState(record[column.name] || '');
	const isDisabled = column.disabled;

	// Update local value when record changes (e.g., after reset)
	useEffect(() => {
		setValue(record[column.name] || '');
	}, [record[column.name]]);

	const handleChange = (newValue: string) => {
		setValue(newValue);
		// Notify parent of change
		if (onCellChange) {
			onCellChange(newValue);
		}
	};

	return (
		<input
			type={column.inputType || 'text'}
			value={value}
			onChange={e => handleChange(e.target.value)}
			disabled={isDisabled}
			placeholder={column.placeholder}
			className="k-input text-sm py-1.5 px-3 w-full rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
		/>
	);
}
