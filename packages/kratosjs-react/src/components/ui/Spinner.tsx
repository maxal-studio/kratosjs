import React from 'react';
import { cn } from '../../utils/classNames';
import { translate } from '../../i18n/activeLocale';

export interface SpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	/** Optional label rendered next to the spinner */
	label?: string;
}

const SIZE_CLASSES = {
	sm: 'h-4 w-4 border-2',
	md: 'h-6 w-6 border-2',
	lg: 'h-8 w-8 border-[3px]',
} as const;

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
	const circle = (
		<span
			role="status"
			aria-label={label || translate('core:common.loading')}
			className={cn(
				'inline-block animate-spin rounded-full border-current border-t-transparent',
				SIZE_CLASSES[size],
				className,
			)}
		/>
	);

	if (!label) return circle;

	return (
		<span className="inline-flex items-center gap-2 text-fg-secondary">
			{circle}
			<span className="text-sm">{label}</span>
		</span>
	);
}
