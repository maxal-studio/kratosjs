import React from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatSelectLabel } from '../utils/formatValue';

/**
 * Radio field component
 * Renders a radio button group
 */
export function RadioField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const displayValue = formatSelectLabel(value, props.options);
		return <ViewFieldWrapper label={props.label}>{displayValue}</ViewFieldWrapper>;
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
			{props.label && (
				<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			<div className="space-y-2">
				{props.options &&
					Object.entries(props.options).map(([value, label]) => (
						<div key={value} className="flex items-center">
							<input
								id={`${props.name}-${value}`}
								type="radio"
								{...register(props.name, validation)}
								value={value}
								disabled={props.disabled}
								className={cn(
									'w-4 h-4 border',
									'text-accent dark:text-accent',
									'k-input',
									'focus:ring-2 focus:ring-ring',
									'transition duration-150 ease-in-out',
									hasError && 'border-red-500 dark:border-red-400',
									props.disabled && 'opacity-60 cursor-not-allowed',
								)}
							/>
							<label
								htmlFor={`${props.name}-${value}`}
								className={cn(
									'ml-3 text-sm text-gray-700 dark:text-gray-300',
									props.disabled && 'opacity-60 cursor-not-allowed',
								)}>
								{label}
							</label>
						</div>
					))}
			</div>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}
		</div>
	);
}
