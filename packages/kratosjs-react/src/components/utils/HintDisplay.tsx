import React from 'react';
import { Icon } from './Icon';
import { cn } from '../../utils/classNames';

export interface HintDisplayProps {
	hint?: string;
	hintIcon?: string;
	hintColor?: string;
}

/**
 * Reusable hint display component
 * Shows hint text with optional icon and color
 */
export function HintDisplay({ hint, hintIcon, hintColor }: HintDisplayProps) {
	if (!hint) return null;

	return (
		<div className="mt-1 flex items-center gap-1.5">
			{hintIcon && (
				<Icon name={hintIcon} size={14} className={cn('mt-0.5 shrink-0', hintColor || 'text-accent')} />
			)}
			<p className={cn('text-sm', hintColor || 'text-accent')}>{hint}</p>
		</div>
	);
}
