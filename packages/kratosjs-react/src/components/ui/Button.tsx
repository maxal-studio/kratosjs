import React from 'react';
import { cn } from '../../utils/classNames';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	/** Use squared corners instead of the default pill shape. */
	square?: boolean;
	/** Icon element rendered before the label */
	icon?: React.ReactNode;
}

/* Static class maps — never build Tailwind classes dynamically. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
	primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-soft-sm',
	secondary: 'bg-input text-fg border border-input-border hover:bg-hover shadow-soft-sm',
	ghost: 'bg-transparent text-fg-secondary hover:bg-hover hover:text-fg',
	danger: 'bg-danger text-white hover:bg-danger-hover shadow-soft-sm',
	outline: 'bg-transparent text-fg border border-border-strong hover:bg-hover',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
	sm: 'h-8 px-3 text-xs gap-1.5',
	md: 'h-10 px-4 text-sm gap-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
	{
		variant = 'primary',
		size = 'md',
		loading = false,
		square = false,
		icon,
		className,
		children,
		disabled,
		type,
		...rest
	},
	ref,
) {
	return (
		<button
			ref={ref}
			type={type ?? 'button'}
			disabled={disabled || loading}
			className={cn(
				'inline-flex items-center justify-center font-medium transition-colors touch-manipulation',
				square ? 'rounded-lg' : 'rounded-full',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				'disabled:opacity-60 disabled:cursor-not-allowed',
				VARIANT_CLASSES[variant],
				SIZE_CLASSES[size],
				className,
			)}
			{...rest}>
			{loading ? (
				<Spinner size="sm" className="shrink-0" />
			) : icon ? (
				<span className="shrink-0">{icon}</span>
			) : null}
			{children}
		</button>
	);
});

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
	/** Use squared corners instead of the default pill shape. */
	square?: boolean;
	/** Accessible label (required — icon-only buttons have no text) */
	'aria-label': string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
	{ variant = 'ghost', size = 'md', square = false, className, children, type, ...rest },
	ref,
) {
	return (
		<button
			ref={ref}
			type={type ?? 'button'}
			className={cn(
				'inline-flex items-center justify-center transition-colors touch-manipulation',
				square ? 'rounded-lg' : 'rounded-full',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
				'disabled:opacity-60 disabled:cursor-not-allowed',
				VARIANT_CLASSES[variant],
				size === 'sm' ? 'h-8 w-8' : 'h-10 w-10',
				className,
			)}
			{...rest}>
			{children}
		</button>
	);
});
