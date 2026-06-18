import React from 'react';
import { cn } from '../utils/classNames';

interface CheckboxProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	id?: string;
	className?: string;
	disabled?: boolean;
}

export function Checkbox({ checked, onChange, id, className, disabled }: CheckboxProps) {
	const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

	return (
		<label
			htmlFor={checkboxId}
			className={cn(
				'flex items-center cursor-pointer select-none',
				disabled && 'cursor-not-allowed opacity-50',
				className,
			)}>
			<input
				id={checkboxId}
				type="checkbox"
				checked={checked}
				onChange={e => onChange(e.target.checked)}
				disabled={disabled}
				className="sr-only"
			/>
			<div
				className={cn(
					'w-4 h-4 rounded border transition-colors flex items-center justify-center',
					checked
						? 'bg-accent border-accent'
						: cn(
								'border-gray-300 dark:border-gray-600',
								'bg-gray-200 dark:bg-gray-700',
								'hover:bg-gray-300 dark:hover:bg-gray-600',
							),
					'focus-within:ring-2 focus-within:ring-ring/50 focus-within:border-accent ',
					disabled && 'hover:bg-gray-200 dark:hover:bg-gray-700 cursor-not-allowed',
				)}>
				{checked && (
					<svg
						className="w-3 h-3 text-white"
						fill="none"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth="2.5"
						viewBox="0 0 24 24"
						stroke="currentColor">
						<path d="M5 13l4 4L19 7" />
					</svg>
				)}
			</div>
		</label>
	);
}
