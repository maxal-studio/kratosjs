import React from 'react';
import { cn } from '../../utils/classNames';

const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export type PillButtonVariant = 'default' | 'primary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<PillButtonVariant, string> = {
	default:
		'border border-border bg-input/60 text-fg hover:bg-hover/70 disabled:cursor-not-allowed disabled:opacity-60',
	primary: 'border border-transparent bg-accent text-accent-fg hover:bg-accent-hover shadow-soft-sm',
	danger: 'border border-transparent bg-danger text-white hover:bg-danger-hover shadow-soft-sm',
	ghost: 'border border-transparent bg-transparent text-fg-secondary hover:bg-hover/70 hover:text-fg',
};

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: PillButtonVariant;
	icon?: React.ReactNode;
}

export function PillButton({ variant = 'default', icon, className, children, type, ...rest }: PillButtonProps) {
	return (
		<button
			type={type ?? 'button'}
			className={cn(
				'inline-flex h-9 touch-manipulation items-center justify-center gap-1.5 rounded-full px-3 text-sm font-medium transition-colors',
				focusClass,
				VARIANT_CLASSES[variant],
				className,
			)}
			{...rest}>
			{icon ? <span className="shrink-0">{icon}</span> : null}
			{children}
		</button>
	);
}

export interface PillIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: PillButtonVariant;
	active?: boolean;
}

export function PillIconButton({
	variant = 'default',
	active = false,
	className,
	children,
	type,
	...rest
}: PillIconButtonProps) {
	return (
		<button
			type={type ?? 'button'}
			className={cn(
				'inline-flex h-9 w-9 shrink-0 touch-manipulation items-center justify-center rounded-full text-sm transition-colors',
				focusClass,
				active ? 'border border-border bg-raised text-fg shadow-soft-sm' : VARIANT_CLASSES[variant],
				className,
			)}
			{...rest}>
			{children}
		</button>
	);
}

/** Pill tab styling shared by table tabs, modal relation tabs, and breadcrumbs. */
export function pillTabClass(active: boolean): string {
	return cn(
		'inline-flex shrink-0 touch-manipulation items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors whitespace-nowrap',
		active ? 'bg-raised font-medium text-fg shadow-soft-sm' : 'text-fg-secondary hover:bg-hover/70 hover:text-fg',
	);
}
