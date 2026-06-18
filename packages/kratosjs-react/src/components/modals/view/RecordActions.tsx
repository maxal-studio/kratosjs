import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { PillButton } from '../../ui/PillButton';
import { Icon } from '../../utils/Icon';
import { cn } from '../../../utils/classNames';

export interface RecordActionsProps {
	actions: any[];
	canEdit: boolean;
	canDelete: boolean;
	onAction: (action: any) => void;
	onEdit: () => void;
	onDelete: () => void;
}

/**
 * Sticky action bar at the top of the view modal.
 */
export function RecordActions({ actions, canEdit, canDelete, onAction, onEdit, onDelete }: RecordActionsProps) {
	if (!canEdit && !canDelete && actions.length === 0) {
		return null;
	}

	return (
		<div className="sticky top-0 z-40 flex flex-wrap justify-end gap-1.5 border-b border-border/60 bg-surface px-4 py-3">
			{actions.map(action => (
				<PillButton
					key={action.name}
					onClick={() => onAction(action)}
					className={cn(action.color)}
					icon={action.icon ? <Icon name={action.icon} size={16} /> : undefined}>
					{action.label}
				</PillButton>
			))}

			{canEdit && (
				<PillButton variant="primary" onClick={onEdit} icon={<Edit className="h-4 w-4" />}>
					Edit
				</PillButton>
			)}

			{canDelete && (
				<PillButton variant="danger" onClick={onDelete} icon={<Trash2 className="h-4 w-4" />}>
					Delete
				</PillButton>
			)}
		</div>
	);
}
