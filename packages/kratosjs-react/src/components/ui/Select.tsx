import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/classNames';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	invalid?: boolean;
	/** Highlight the control (e.g. an active filter) */
	active?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
	{ invalid, active, className, children, ...rest },
	ref,
) {
	return (
		<div className={cn('relative', className)}>
			<select
				ref={ref}
				className={cn(
					'w-full h-10 px-3 pr-10 text-sm rounded-lg border appearance-none cursor-pointer transition-colors',
					'bg-input text-fg border-input-border',
					'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
					'disabled:opacity-60 disabled:cursor-not-allowed',
					invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
					active && 'ring-2 ring-ring border-accent',
				)}
				{...rest}>
				{children}
			</select>
			<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
		</div>
	);
});
