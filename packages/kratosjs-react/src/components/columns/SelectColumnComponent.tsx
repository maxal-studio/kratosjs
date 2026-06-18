import React, { useState, useEffect } from 'react';
import { ColumnProps } from './TextColumnComponent';

export interface EditableColumnProps extends ColumnProps {
	onCellChange?: (value: any) => void;
}

export function SelectColumnComponent({ column, record, onCellChange }: EditableColumnProps) {
	const [value, setValue] = useState(record[column.name] || '');
	const isDisabled = column.disabled;

	// Update local value when record changes (e.g., after reset)
	useEffect(() => {
		setValue(record[column.name] || '');
	}, [record[column.name]]);

	const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (isDisabled) return;

		const newValue = e.target.value;
		setValue(newValue);

		// Notify parent of change
		if (onCellChange) {
			onCellChange(newValue);
		}
	};

	return (
		<select
			value={value}
			onChange={handleChange}
			disabled={isDisabled}
			className="k-input text-sm py-1.5 px-3 pr-8 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none bg-no-repeat bg-right"
			style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
				backgroundPosition: 'right 0.5rem center',
				backgroundSize: '1.5em 1.5em',
			}}>
			{column.placeholder && column.selectablePlaceholder && <option value="">{column.placeholder}</option>}
			{column.options &&
				Object.entries(column.options).map(([key, label]) => (
					<option key={key} value={key}>
						{label}
					</option>
				))}
		</select>
	);
}
