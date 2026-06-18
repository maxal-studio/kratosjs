import React from 'react';
import { useWidgetRegistry } from '../../contexts/WidgetRegistryContext';

export interface WidgetBlockRendererProps {
	block: any;
	data: any;
}

export function WidgetBlockRenderer({ block, data }: WidgetBlockRendererProps) {
	const widgets = useWidgetRegistry();
	const WidgetComponent = widgets[block.widget.type];

	if (!WidgetComponent) {
		console.warn(`Widget type "${block.widget.type}" not registered`);
		return null;
	}

	return <WidgetComponent widget={block.widget} data={data} />;
}
