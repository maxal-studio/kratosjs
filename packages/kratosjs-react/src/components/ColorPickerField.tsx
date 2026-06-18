import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';

/**
 * ColorPicker field component
 * Renders a color input with preview
 */
export function ColorPickerField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value || '#000000';
		return (
			<ViewFieldWrapper label={props.label}>
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded border border-border" style={{ backgroundColor: value }} />
					<span className="text-fg font-mono">{value}</span>
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

	// Watch the color value for preview
	const colorValue = useWatch({ control, name: props.name, defaultValue: props.default || '#000000' });

	return (
		<div className="mb-4">
			{props.label && (
				<label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			<div className="flex items-center gap-3">
				<input
					id={props.name}
					type="color"
					{...register(props.name, validation)}
					disabled={props.disabled}
					className={cn(
						'h-10 w-20 border rounded-lg cursor-pointer',
						'k-input',
						'focus:outline-none focus:ring-2 focus:ring-ring',
						'transition duration-150 ease-in-out',
						hasError && 'border-red-500 dark:border-red-400',
						props.disabled && 'opacity-60 cursor-not-allowed',
					)}
				/>

				<div className="flex-1">
					<input
						type="text"
						value={colorValue}
						readOnly
						className={cn(
							'w-full px-3 py-2 border rounded-lg shadow-sm',
							'bg-muted text-fg border-border text-sm font-mono',
						)}
					/>
				</div>

				<div
					className="h-10 w-10 rounded-lg border-2 border-border shadow-sm"
					style={{ backgroundColor: colorValue }}
					title="Color preview"
				/>
			</div>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}
		</div>
	);
}
