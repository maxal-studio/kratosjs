import React from 'react';
import { Inbox } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface EmptyStateProps {
	icon?: React.ReactNode;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
	return (
		<div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
			<div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-fg-muted">
				{icon ?? <Inbox className="h-6 w-6" />}
			</div>
			<p className="text-sm font-semibold text-fg">{title}</p>
			{description && <p className="mt-1 max-w-sm text-sm text-fg-secondary">{description}</p>}
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
