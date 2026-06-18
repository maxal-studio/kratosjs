import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatTextarea } from '../utils/formatValue';

/**
 * Textarea field component
 * Renders multi-line text input with character count
 */
export function TextareaField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const displayValue =
			props.renderHtml && value != null && (typeof value === 'string' || typeof value === 'number') ? (
				<div className="kratosjshtml-content" dangerouslySetInnerHTML={{ __html: String(value) }} />
			) : (
				formatTextarea(value)
			);
		return <ViewFieldWrapper label={props.label}>{displayValue}</ViewFieldWrapper>;
	}

	const {
		register,
		control,
		formState: { errors },
	} = useFormContext();

	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const error = getFieldError(errors, props.name);
	const hasError = !!error;

	// Watch the field value for character count
	const value = useWatch({ control, name: props.name, defaultValue: '' });
	const currentLength = value?.length || 0;
	const maxLength = props.maxLength;

	return (
		<div className="mb-4">
			{props.label && (
				<label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			<textarea
				id={props.name}
				{...register(props.name, validation)}
				placeholder={props.placeholder}
				disabled={props.disabled}
				readOnly={props.readOnly}
				rows={props.rows || 4}
				cols={props.cols}
				className={cn(
					'w-full px-3 py-2 border rounded-lg shadow-sm',
					'k-input',
					'focus:outline-none focus:ring-2 focus:ring-ring',
					'transition duration-150 ease-in-out',
					'resize-y',
					hasError && 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400',
					props.disabled && 'opacity-60 cursor-not-allowed',
					props.readOnly && 'bg-muted',
				)}
			/>

			{maxLength && (
				<div className="mt-1 flex justify-between items-center">
					<div className="flex-1">
						{hasError && (
							<p className="text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>
						)}
						{props.helperText && !hasError && (
							<p className="text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>
						)}
						{!hasError && (
							<HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />
						)}
					</div>
					<p
						className={cn(
							'text-xs ml-2',
							currentLength > maxLength
								? 'text-red-600 dark:text-red-400 font-medium'
								: 'text-gray-500 dark:text-gray-400',
						)}>
						{currentLength} / {maxLength}
					</p>
				</div>
			)}

			{!maxLength && hasError && (
				<p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>
			)}

			{!maxLength && props.helperText && (
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>
			)}

			{!maxLength && !hasError && (
				<HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />
			)}
		</div>
	);
}
