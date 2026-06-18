import React, { useState } from 'react';
import { BlockRenderer } from './BlockRenderer';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';

export interface TabsBlockRendererProps {
	block: any;
	blockData?: Record<string, any>;
	apiBaseUrl?: string;
}

export function TabsBlockRenderer({ block, blockData, apiBaseUrl }: TabsBlockRendererProps) {
	const [activeTab, setActiveTab] = useState(block.defaultTab || 0);

	return (
		<>
			{/* Tab Headers */}
			<div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
				{block.tabs.map((tab: any, index: number) => (
					<button
						key={index}
						onClick={() => setActiveTab(index)}
						className={cn(
							'px-4 py-2 font-medium text-sm transition-colors',
							'border-b-2 -mb-px',
							activeTab === index
								? 'border-accent text-accent'
								: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
						)}>
						{tab.icon && (
							<span className="inline-flex items-center gap-2">
								<Icon name={tab.icon} className="w-4 h-4" />
								{tab.label}
							</span>
						)}
						{!tab.icon && tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div>
				{block.tabs[activeTab]?.blocks.map((nestedBlock: any, index: number) => (
					<BlockRenderer key={index} block={nestedBlock} blockData={blockData} apiBaseUrl={apiBaseUrl} />
				))}
			</div>
		</>
	);
}
