import React from 'react';
import { cn } from '../../utils/classNames';

export interface ViewFieldWrapperProps {
	label?: string;
	children: React.ReactNode;
	className?: string;
}

/**
 * Wrapper component for consistent view mode field styling
 * Provides label/value layout with consistent spacing and typography
 */
export function ViewFieldWrapper({ label, children, className }: ViewFieldWrapperProps) {
	return (
		<div className={cn('grid grid-cols-3 gap-4 pb-2', className)}>
			{label && <div className="font-medium text-fg-secondary">{label}:</div>}
			<div className={cn('text-fg', label ? 'col-span-2' : 'col-span-3')}>
				{children || <span className="text-fg-secondary">-</span>}
			</div>
		</div>
	);
}
