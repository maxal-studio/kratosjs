import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { Icon } from './utils/Icon';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatBoolean } from '../utils/formatValue';

/**
 * Toggle field component
 * Renders a toggle switch with custom colors
 */
export function ToggleField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const displayValue = formatBoolean(value);
		const isChecked = Boolean(value);

		const onColor = 'text-green-600';
		const offColor = 'text-red-600';

		return (
			<ViewFieldWrapper label={props.label}>
				<div className="flex items-center gap-3">
					<span className={cn(isChecked ? onColor : offColor)}>{displayValue}</span>
				</div>
			</ViewFieldWrapper>
		);
	}

	const {
		register,
		control,
		formState: { errors },
	} = useFormContext();

	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	// Watch the toggle state
	const isChecked = useWatch({ control, name: props.name, defaultValue: props.default || false });

	// Map color names to Tailwind classes
	const getColorClass = (color?: string) => {
		const colorMap: Record<string, string> = {
			success: 'bg-green-600 dark:bg-green-500',
			danger: 'bg-red-600 dark:bg-red-500',
			warning: 'bg-yellow-600 dark:bg-yellow-500',
			info: 'bg-accent',
			primary: 'bg-accent',
		};
		return colorMap[color || ''] || 'bg-accent';
	};

	// Map semantic color names to Tailwind classes; pass through full class strings as-is
	const resolveTrackColor = (color: string | undefined, fallback: string): string[] => {
		if (!color) return fallback.split(/\s+/);
		if (/\b(bg|text)-/.test(color)) return color.split(/\s+/);
		return getColorClass(color).split(/\s+/);
	};

	const onColor = resolveTrackColor(props.onColor, 'bg-accent');
	const offColor = resolveTrackColor(props.offColor, 'bg-gray-200 dark:bg-gray-700');

	return (
		<div className="mb-4">
			<div className="flex items-center justify-between">
				<div className="flex-1">
					{props.label && (
						<label
							htmlFor={props.name}
							className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							{props.label}
							{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
						</label>
					)}
				</div>

				<button
					type="button"
					role="switch"
					aria-checked={isChecked}
					disabled={props.disabled}
					onClick={() => {
						const checkbox = document.getElementById(props.name) as HTMLInputElement;
						if (checkbox) {
							checkbox.click();
						}
					}}
					className={cn(
						'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent',
						'transition-colors duration-200 ease-in-out',
						'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 dark:focus:ring-offset-gray-900',
						...(isChecked ? onColor : offColor),
						props.disabled && 'opacity-60 cursor-not-allowed',
					)}>
					<span
						className={cn(
							'pointer-events-none inline-flex items-center justify-center h-5 w-5 transform rounded-full bg-white dark:bg-gray-200 shadow ring-0',
							'transition duration-200 ease-in-out',
							isChecked ? 'translate-x-5' : 'translate-x-0',
						)}>
						{props.onIcon && isChecked && <Icon name={props.onIcon} size={12} className="text-green-600" />}
						{props.offIcon && !isChecked && (
							<Icon name={props.offIcon} size={12} className="text-gray-400" />
						)}
					</span>
				</button>

				{/* Hidden checkbox for form integration */}
				<input id={props.name} type="checkbox" {...register(props.name, validation)} className="sr-only" />
			</div>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}
		</div>
	);
}
