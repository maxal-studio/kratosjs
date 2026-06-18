import React from 'react';
import { cn } from '../../utils/classNames';

export type BadgeVariant = 'neutral' | 'accent' | 'success' | 'danger' | 'warning';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: BadgeVariant;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
	neutral: 'bg-muted text-fg-secondary',
	accent: 'bg-accent-soft text-accent',
	success: 'bg-success-soft text-success',
	danger: 'bg-danger-soft text-danger',
	warning: 'bg-warning-soft text-warning',
};

export function Badge({ variant = 'neutral', className, children, ...rest }: BadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
				VARIANT_CLASSES[variant],
				className,
			)}
			{...rest}>
			{children}
		</span>
	);
}
