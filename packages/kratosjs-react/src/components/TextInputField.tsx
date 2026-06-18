import React from 'react';
import { useFormContext } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatNumber } from '../utils/formatValue';

/**
 * TextInput field component
 * Renders text, email, password, number, tel, and url inputs
 */
export function TextInputField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		let displayValue: React.ReactNode = value;

		// Format numbers if inputType is numeric
		if (props.inputType === 'number' && value !== null && value !== undefined) {
			displayValue = formatNumber(value);
		} else if (value === null || value === undefined) {
			displayValue = '-';
		} else if (props.renderHtml && (typeof value === 'string' || typeof value === 'number')) {
			displayValue = <div className="kratosjshtml-content" dangerouslySetInnerHTML={{ __html: String(value) }} />;
		} else {
			// If is object, convert it into a ul list
			if (typeof value === 'object') {
				displayValue = (
					<div className="space-y-2">
						{Object.entries(value).map(([key, value]) => (
							<div key={key}>
								<b>{key}</b> : {typeof value === 'object' ? JSON.stringify(value) : String(value)}
							</div>
						))}
					</div>
				);
			} else {
				displayValue = String(value);
			}
		}

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
				<label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			<input
				id={props.name}
				type={props.inputType || 'text'}
				{...register(props.name, validation)}
				placeholder={props.placeholder}
				disabled={props.disabled}
				readOnly={props.readOnly}
				className={cn(
					'w-full px-3 py-2 border rounded-lg shadow-sm',
					'k-input',
					'focus:outline-none focus:ring-2 focus:ring-ring',
					'transition duration-150 ease-in-out',
					hasError && 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400',
					props.disabled && 'opacity-60 cursor-not-allowed',
					props.readOnly && 'bg-muted',
				)}
			/>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}
		</div>
	);
}
