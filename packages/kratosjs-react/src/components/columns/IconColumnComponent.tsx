import React from 'react';
import { ColumnProps } from './TextColumnComponent';
import { formatValue } from '../../utils/tableFormatters';
import { cn } from '../../utils/classNames';
import { Icon, IconName } from '../utils/Icon';
import { executeSerializedFunction } from '../../runtime/serializedFunctions';

export function IconColumnComponent({ column, record }: ColumnProps) {
	const rawValue = record[column.name];
	// Apply formatStateUsing if present
	const value = formatValue(rawValue, column, record);

	// Determine icon name
	let iconName: string | null = null;
	if (column.iconFn) {
		// Execute serialized function
		const result = executeSerializedFunction(column.iconFn, value, record);
		iconName = result !== undefined ? result : null;
	} else if (column.icon) {
		if (typeof column.icon === 'string') {
			// Static icon
			iconName = column.icon;
		} else if (typeof column.icon === 'object') {
			// Object mapping
			iconName = column.icon[value] || null;
		}
	}

	// Determine color class
	let colorClass = 'text-fg';
	if (column.iconColorFn) {
		// Execute serialized function
		const result = executeSerializedFunction(column.iconColorFn, value, record);
		colorClass = result !== undefined ? result : 'text-fg';
	} else if (column.iconColor) {
		if (typeof column.iconColor === 'string') {
			// Static color
			colorClass = column.iconColor;
		} else if (typeof column.iconColor === 'object') {
			// Object mapping
			colorClass = column.iconColor[value] || 'text-fg';
		}
	}

	// If no icon is determined, show placeholder
	if (!iconName) {
		return <span className="text-fg-secondary">-</span>;
	}

	// Get size from column (default to 20px)
	const size = column.size || 20;

	// Render Lucide icon
	return <Icon name={iconName} size={size} className={cn(colorClass)} />;
}
