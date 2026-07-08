import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { PillButton } from '../../ui/PillButton';
import { Icon } from '../../utils/Icon';
import { cn } from '../../../utils/classNames';
import { translate } from '../../../i18n/activeLocale';
import { Slot } from '../../../slots/Slot';

export interface RecordActionsProps {
	actions: any[];
	canEdit: boolean;
	canDelete: boolean;
	onAction: (action: any) => void;
	onEdit: () => void;
	onDelete: () => void;
	/** Resource slug, forwarded to the `detail.actions` slot context. */
	resourceSlug?: string;
	/** The loaded record, forwarded to the `detail.actions` slot context. */
	record?: Record<string, any>;
}

/**
 * Sticky action bar at the top of the view modal.
 */
export function RecordActions({
	actions,
	canEdit,
	canDelete,
	onAction,
	onEdit,
	onDelete,
	resourceSlug,
	record,
}: RecordActionsProps) {
	// The action bar renders whenever there are built-in actions OR a slot
	// contribution; the `empty:hidden` utility collapses it when nothing renders
	// (the slot wrapper returns no DOM when no contributions are registered).
	return (
		<div
			className="sticky top-0 z-40 flex w-full max-w-full min-w-0 touch-pan-x items-center gap-1.5 overflow-x-auto overscroll-x-contain border-b border-border/60 bg-surface px-4 py-3 empty:hidden"
			style={{ WebkitOverflowScrolling: 'touch' }}>
			<Slot
				name="detail.actions"
				context={{ resourceSlug, record }}
				as="div"
				className="flex shrink-0 items-center gap-1.5 empty:hidden"
			/>
			<div className="ml-auto flex shrink-0 items-center gap-1.5">
				{actions.map(action => (
					<PillButton
						key={action.name}
						onClick={() => onAction(action)}
						className={cn('shrink-0', action.color)}
						icon={action.icon ? <Icon name={action.icon} size={16} /> : undefined}>
						{action.label}
					</PillButton>
				))}

				{canEdit && (
					<PillButton
						variant="primary"
						className="shrink-0"
						onClick={onEdit}
						icon={<Edit className="h-4 w-4" />}>
						{translate('core:common.edit')}
					</PillButton>
				)}

				{canDelete && (
					<PillButton
						variant="danger"
						className="shrink-0"
						onClick={onDelete}
						icon={<Trash2 className="h-4 w-4" />}>
						{translate('core:common.delete')}
					</PillButton>
				)}
			</div>
		</div>
	);
}
