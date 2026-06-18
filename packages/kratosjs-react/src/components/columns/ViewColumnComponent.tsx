import React from 'react';
import { ColumnProps } from './TextColumnComponent';

export function ViewColumnComponent({ column, record }: ColumnProps) {
	// ViewColumn is for custom rendering - in a real implementation,
	// this would load a custom view/template
	// For now, just display a placeholder
	return <span className="text-fg-secondary italic">Custom view: {column.view}</span>;
}
