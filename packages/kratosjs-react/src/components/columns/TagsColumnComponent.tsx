import React from 'react';
import { ColumnProps } from './TextColumnComponent';
import { cn } from '../../utils/classNames';
import { formatValue } from '../../utils/tableFormatters';

export function TagsColumnComponent({ column, record }: ColumnProps) {
	const rawValue = record[column.name];
	// Apply formatter if present
	const value = formatValue(rawValue, column, record);

	if (!value || (Array.isArray(value) && value.length === 0)) {
		return <span className="text-fg-secondary">-</span>;
	}

	const tags = Array.isArray(value) ? value : [value];
	const displayTags = column.limit ? tags.slice(0, column.limit) : tags;

	// If no tags to display, return empty
	if (!displayTags || displayTags.length === 0) {
		return <></>;
	}

	return (
		<div className="flex flex-wrap gap-1">
			{displayTags.map((tag, idx) => (
				<span
					key={idx}
					className={cn(
						'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
						'bg-accent-soft dark:bg-accent-soft text-accent',
					)}>
					{String(tag)}
				</span>
			))}
			{column.limit && tags.length > column.limit && (
				<span
					className={cn(
						'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
						'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300',
					)}>
					+{tags.length - column.limit}
				</span>
			)}
		</div>
	);
}
