import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatDate as formatDateValue } from '../utils/formatValue';

/**
 * DateTimePicker field component
 * Renders a date/datetime input
 */
export function DateTimePickerField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const displayValue = formatDateValue(value, props.displayFormat || props.format);
		return <ViewFieldWrapper label={props.label}>{displayValue}</ViewFieldWrapper>;
	}

	const {
		register,
		formState: { errors },
		control,
	} = useFormContext();

	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	// Watch the current value to format it for the input
	const currentValue = useWatch({
		control,
		name: props.name,
		defaultValue: undefined,
	});

	// Determine input type based on format
	const getInputType = () => {
		const format = props.format?.toLowerCase() || '';

		// Time only (HH:mm, HH:mm:ss, h:m, etc.)
		if (format.includes('hh:mm') || format.includes('h:m')) {
			// Check if it's ONLY time (no date components)
			const hasDateComponent =
				format.includes('yyyy') || format.includes('dd') || format.includes('mm/') || format.includes('dd/');
			if (!hasDateComponent) {
				return 'time';
			}
			// Has both date and time
			return 'datetime-local';
		}

		// Default to date
		return 'date';
	};

	// Format min/max dates/times for HTML input
	const formatDate = (date: string | Date | null | undefined) => {
		if (!date) return undefined;
		const d = new Date(date);
		const inputType = getInputType();

		if (inputType === 'time') {
			// Format as HH:mm for time input
			return d.toTimeString().slice(0, 5);
		} else if (inputType === 'datetime-local') {
			// Format as YYYY-MM-DDTHH:mm for datetime-local input
			return d.toISOString().slice(0, 16);
		}

		// Format as YYYY-MM-DD for date input
		return d.toISOString().split('T')[0];
	};

	return (
		<div className="mb-4">
			{props.label && (
				<label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			<input
				id={props.name}
				type={getInputType()}
				{...register(props.name, validation)}
				value={currentValue ? formatDate(currentValue) : ''}
				disabled={props.disabled}
				min={formatDate(props.minDate)}
				max={formatDate(props.maxDate)}
				className={cn(
					'w-full px-3 py-2 border rounded-lg shadow-sm',
					'k-input',
					'focus:outline-none focus:ring-2 focus:ring-ring',
					'transition duration-150 ease-in-out',
					hasError && 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400',
					props.disabled && 'opacity-60 cursor-not-allowed',
				)}
			/>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}
		</div>
	);
}
