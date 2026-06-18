import React from 'react';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';
import { pillTabClass } from '../ui/PillButton';

export interface TableTab {
	key: string;
	label: string;
	icon?: string;
	default?: boolean;
}

interface TableTabsProps {
	tabs: TableTab[];
	activeTab: string | null;
	onTabChange: (tabKey: string | null) => void;
}

export function TableTabs({ tabs, activeTab, onTabChange }: TableTabsProps) {
	return (
		<div
			className={cn(
				'flex w-full max-w-full touch-pan-x snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain sm:snap-none',
			)}
			style={{ WebkitOverflowScrolling: 'touch' }}
			role="tablist"
			aria-label="Table view tabs">
			<button
				role="tab"
				aria-selected={activeTab === null}
				onClick={() => onTabChange(null)}
				className={pillTabClass(activeTab === null)}>
				All
			</button>
			{tabs.map(tab => (
				<button
					key={tab.key}
					role="tab"
					aria-selected={activeTab === tab.key}
					onClick={() => onTabChange(tab.key)}
					className={pillTabClass(activeTab === tab.key)}>
					{tab.icon && <Icon name={tab.icon} className="h-4 w-4 shrink-0" />}
					<span className="whitespace-nowrap">{tab.label}</span>
				</button>
			))}
		</div>
	);
}
