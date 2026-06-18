import React from 'react';
import { cn } from '../../utils/classNames';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
	/** Raised cards get a soft shadow (modals, popovers); flat cards only a border */
	raised?: boolean;
	padding?: boolean;
}

export function Card({ raised = false, padding = true, className, children, ...rest }: CardProps) {
	return (
		<div
			className={cn(
				'rounded-lg border border-border',
				raised ? 'bg-raised shadow-soft' : 'bg-surface shadow-soft-sm',
				padding && 'p-4 sm:p-6',
				className,
			)}
			{...rest}>
			{children}
		</div>
	);
}
