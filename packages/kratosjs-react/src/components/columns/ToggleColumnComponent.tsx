import React, { useState, useEffect } from 'react';
import { ColumnProps } from './TextColumnComponent';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';

export interface EditableColumnProps extends ColumnProps {
	onCellChange?: (value: any) => void;
}

export function ToggleColumnComponent({ column, record, onCellChange }: EditableColumnProps) {
	const [value, setValue] = useState(Boolean(record[column.name]));
	const isDisabled = column.disabled;

	// Update local value when record changes (e.g., after reset)
	useEffect(() => {
		setValue(Boolean(record[column.name]));
	}, [record[column.name]]);

	const handleToggle = () => {
		if (isDisabled) return;

		const newValue = !value;
		setValue(newValue);

		// Notify parent of change
		if (onCellChange) {
			onCellChange(newValue);
		}
	};

	// Get colors
	const trackClasses =
		(value ? column.onColor : column.offColor) ?? (value ? 'bg-accent' : 'bg-gray-200 dark:bg-gray-700');

	return (
		<button
			type="button"
			onClick={handleToggle}
			disabled={isDisabled}
			className={cn(
				'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
				'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				'disabled:opacity-50 disabled:cursor-not-allowed',
				...trackClasses.split(/\s+/),
			)}>
			<span
				className={cn(
					'inline-flex items-center justify-center h-4 w-4 transform rounded-full bg-white transition-transform',
					value ? 'translate-x-6' : 'translate-x-1',
				)}>
				{column.onIcon && value && <Icon name={column.onIcon} size={10} className="text-green-600" />}
				{column.offIcon && !value && <Icon name={column.offIcon} size={10} className="text-gray-400" />}
			</span>
		</button>
	);
}
