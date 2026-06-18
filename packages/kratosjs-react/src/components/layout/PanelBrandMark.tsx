import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { Icon } from '../utils/Icon';
import { cn } from '../../utils/classNames';

export interface PanelBrandMarkProps {
	icon?: string;
	favicon?: string;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
}

const SIZE_CLASSES = {
	sm: {
		box: 'h-8 w-8 rounded-lg',
		lucide: 'h-4 w-4',
		image: 'h-5 w-5',
	},
	md: {
		box: 'h-10 w-10 rounded-xl',
		lucide: 'h-5 w-5',
		image: 'h-6 w-6',
	},
	lg: {
		box: 'h-12 w-12 rounded-xl',
		lucide: 'h-6 w-6',
		image: 'h-7 w-7',
	},
} as const;

export function PanelBrandMark({ icon, favicon, size = 'md', className }: PanelBrandMarkProps) {
	const sizes = SIZE_CLASSES[size];

	if (favicon) {
		return (
			<div
				className={cn(
					'flex shrink-0 items-center justify-center overflow-hidden bg-surface ring-1 ring-border',
					sizes.box,
					className,
				)}>
				<img src={favicon} alt="" className={cn('object-contain', sizes.image)} />
			</div>
		);
	}

	return (
		<div
			className={cn(
				'flex shrink-0 items-center justify-center bg-accent-soft ring-1 ring-accent/10',
				sizes.box,
				className,
			)}>
			{icon ? (
				<Icon name={icon as any} className={cn('text-accent', sizes.lucide)} />
			) : (
				<LayoutDashboard className={cn('text-accent', sizes.lucide)} />
			)}
		</div>
	);
}
