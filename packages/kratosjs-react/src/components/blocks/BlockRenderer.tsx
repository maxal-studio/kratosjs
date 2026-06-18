import React from 'react';
import { useBlockRegistry } from '../../contexts/BlockRegistryContext';
import { WidgetBlockRenderer } from './WidgetBlockRenderer';
import { FormBlockRenderer } from './FormBlockRenderer';
import { TableBlockRenderer } from './TableBlockRenderer';
import { TabsBlockRenderer } from './TabsBlockRenderer';

export interface BlockRendererProps {
	block: any; // SerializedBlock
	blockData?: Record<string, any>; // Pre-fetched data (e.g., widget data)
	apiBaseUrl?: string;
}

export function BlockRenderer({ block, blockData, apiBaseUrl }: BlockRendererProps) {
	const blocks = useBlockRegistry();
	let content: React.ReactNode;

	switch (block.type) {
		case 'widget':
			content = <WidgetBlockRenderer block={block} data={blockData?.[block.widget.name]} />;
			break;
		case 'form':
			content = <FormBlockRenderer block={block} apiBaseUrl={apiBaseUrl} />;
			break;
		case 'table':
			content = <TableBlockRenderer block={block} apiBaseUrl={apiBaseUrl} />;
			break;
		case 'tabs':
			content = <TabsBlockRenderer block={block} blockData={blockData} apiBaseUrl={apiBaseUrl} />;
			break;
		default: {
			const CustomBlockComponent = blocks[block.type];
			if (CustomBlockComponent) {
				content = <CustomBlockComponent block={block} blockData={blockData} apiBaseUrl={apiBaseUrl} />;
			} else {
				console.warn(`Unknown block type: ${block.type}`);
				return null;
			}
			break;
		}
	}

	return (
		<div className="mb-6">
			{(block.title || block.subtitle) && (
				<div className="mb-1">
					{block.title && (
						<h2 className="text-xl text-gray-900 dark:text-gray-100 font-semibold mb-1">{block.title}</h2>
					)}
					{block.subtitle && <p className="text-sm text-gray-600 dark:text-gray-400">{block.subtitle}</p>}
				</div>
			)}
			{content}
		</div>
	);
}
