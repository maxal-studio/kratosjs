import React from 'react';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';

export interface WidgetShellProps {
	label?: string;
	icon?: string;
	/** Optional control rendered in the header, before the corner icon (e.g. a legend toggle). */
	headerAction?: React.ReactNode;
	className?: string;
	children: React.ReactNode;
}

/** Shared card shell for dashboard/table widgets. */
export function WidgetShell({ label, icon, headerAction, className, children }: WidgetShellProps) {
	return (
		<div
			className={cn(
				'flex h-[10.5rem] flex-col rounded-xl border border-border bg-surface p-4 transition-colors hover:bg-hover/20',
				className,
			)}>
			{(label || icon || headerAction) && (
				<div className="mb-3 flex items-start justify-between gap-2">
					{label ? (
						<p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted">{label}</p>
					) : (
						<span />
					)}
					{(headerAction || icon) && (
						<div className="flex shrink-0 items-center gap-1.5">
							{headerAction}
							{icon && (
								<div className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-fg-secondary shadow-soft-sm">
									<Icon name={icon} className="h-4 w-4" />
								</div>
							)}
						</div>
					)}
				</div>
			)}
			<div className="flex min-h-0 flex-1 flex-col">{children}</div>
		</div>
	);
}
