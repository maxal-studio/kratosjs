import React from 'react';
import { cn } from '../../utils/classNames';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	/** Render the error state (red border/ring) */
	invalid?: boolean;
}

export const inputClasses = (invalid?: boolean, className?: string) =>
	cn(
		'w-full h-10 px-3 text-sm rounded-lg border transition-colors',
		'bg-input text-fg border-input-border placeholder:text-fg-muted',
		'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
		'disabled:opacity-60 disabled:cursor-not-allowed',
		invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
		className,
	);

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
	{ invalid, className, ...rest },
	ref,
) {
	return <input ref={ref} className={inputClasses(invalid, className)} {...rest} />;
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
	{ invalid, className, ...rest },
	ref,
) {
	return (
		<textarea
			ref={ref}
			className={cn(
				'w-full px-3 py-2 text-sm rounded-lg border transition-colors',
				'bg-input text-fg border-input-border placeholder:text-fg-muted',
				'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
				'disabled:opacity-60 disabled:cursor-not-allowed',
				invalid && 'border-danger focus:border-danger focus:ring-danger-soft',
				className,
			)}
			{...rest}
		/>
	);
});
