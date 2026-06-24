import React from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';
import { translate } from '../../i18n/activeLocale';

interface TableBulkActionsProps {
	schema: SerializedTable;
	selectedCount: number;
	onBulkAction: (actionName: string, selectedIds: any[]) => void;
	onClearSelection: () => void;
	canDelete?: boolean;
}

export function TableBulkActions({
	schema,
	selectedCount,
	onBulkAction,
	onClearSelection,
	canDelete = true,
}: TableBulkActionsProps) {
	if (selectedCount === 0 || !schema.bulkActions || schema.bulkActions.length === 0) {
		return null;
	}

	const visibleBulkActions = schema.bulkActions.filter(action => {
		if ((action.name === 'delete' || action.name === 'bulkDelete') && !canDelete) {
			return false;
		}
		return true;
	});

	if (visibleBulkActions.length === 0) {
		return null;
	}

	return (
		<div className="mb-4 flex items-center justify-between gap-3 rounded-full border border-border bg-raised/60 px-4 py-2.5 shadow-soft-sm">
			<span className="text-sm font-medium text-fg">
				{selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
			</span>
			<div className="flex flex-wrap items-center gap-2">
				{visibleBulkActions.map(action => (
					<button
						key={action.name}
						onClick={() => onBulkAction(action.name, [])}
						className={cn(
							'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
							action.color
								? `${action.color} hover:opacity-90`
								: 'text-fg-secondary hover:bg-hover/70 hover:text-fg',
						)}>
						{action.icon && <Icon name={action.icon} size={16} />}
						{action.label || action.name}
					</button>
				))}
				<button
					onClick={onClearSelection}
					className="rounded-full px-3 py-1.5 text-sm font-medium text-fg-muted transition-colors hover:bg-hover/70 hover:text-fg">
					{translate('core:common.clear')}
				</button>
			</div>
		</div>
	);
}
