import React from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatBoolean } from '../utils/formatValue';
import { Icon } from './utils/Icon';

/**
 * Checkbox field component
 * Renders a single checkbox input
 */
export function CheckboxField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const displayValue = formatBoolean(value);
		return (
			<ViewFieldWrapper label={props.label}>
				<div className="flex items-center gap-2">
					{value ? (
						<Icon name="Check" size={16} className="text-green-600" />
					) : (
						<Icon name="X" size={16} className="text-gray-400" />
					)}
					<span>{displayValue}</span>
				</div>
			</ViewFieldWrapper>
		);
	}

	const {
		register,
		formState: { errors },
	} = useFormContext();

	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	return (
		<div className="mb-4">
			<div className="flex items-start">
				<div className="flex items-center h-5">
					<input
						id={props.name}
						type="checkbox"
						{...register(props.name, validation)}
						disabled={props.disabled}
						className={cn(
							'w-4 h-4 border rounded',
							'text-accent dark:text-accent',
							'k-input',
							'focus:ring-2 focus:ring-ring',
							'transition duration-150 ease-in-out',
							hasError && 'border-red-500 dark:border-red-400',
							props.disabled && 'opacity-60 cursor-not-allowed',
						)}
					/>
				</div>

				{props.label && (
					<div className="ml-3">
						<label htmlFor={props.name} className="text-sm font-medium text-gray-700 dark:text-gray-300">
							{props.label}
							{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
						</label>

						{props.helperText && (
							<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{props.helperText}</p>
						)}
					</div>
				)}
			</div>

			{hasError && <p className="mt-1 ml-7 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{!hasError && (
				<div className="ml-7">
					<HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />
				</div>
			)}
		</div>
	);
}
