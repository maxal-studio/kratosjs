import { FieldProps, useValidation, getFieldError, ViewFieldWrapper, cn } from '@maxal_studio/kratosjs-react';
import { useFormContext, useWatch } from 'react-hook-form';

/**
 * App-level custom field component — no plugin required.
 *
 * Registered in src/admin/main.tsx via:
 *   mountAdminPanel({ fields: { 'star-rating': StarRatingField } })
 *
 * The key 'star-rating' matches the backend StarRating field's componentType.
 */
export default function StarRatingField(props: FieldProps) {
	const maxStars = (props.maxStars as number) || 5;

	// View mode: read-only display
	if (props.mode === 'view') {
		const value = props.value || 0;
		return (
			<ViewFieldWrapper label={props.label}>
				<div className="flex items-center gap-1">
					{Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
						<span key={star} className={cn('text-lg', star <= value ? 'text-yellow-400' : 'text-gray-300')}>
							{star <= value ? '★' : '☆'}
						</span>
					))}
				</div>
			</ViewFieldWrapper>
		);
	}

	// Edit mode: interactive input wired into react-hook-form
	const { register, setValue } = useFormContext();
	const fieldValue = useWatch({ name: props.name }) || 0;

	// Run this field's rules through the shared engine (same one the server uses).
	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const { formState } = useFormContext();
	const error = getFieldError(formState.errors, props.name);

	return (
		<div>
			<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				{props.label}
				{validation.required && <span className="text-red-500 ml-1">*</span>}
			</label>
			<div className="flex items-center gap-1">
				{Array.from({ length: maxStars }, (_, i) => i + 1).map(star => (
					<button
						key={star}
						type="button"
						aria-label={`Rate ${star}`}
						onClick={() => setValue(props.name, star, { shouldValidate: true, shouldDirty: true })}
						className={cn(
							'text-2xl transition-colors',
							star <= fieldValue ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-200',
						)}>
						{star <= fieldValue ? '★' : '☆'}
					</button>
				))}
			</div>
			{/* Hidden input registers the value (and its validation) with react-hook-form */}
			<input type="hidden" {...register(props.name, validation)} value={fieldValue} />
			{error && <p className="mt-1 text-sm text-red-500">{error.message as string}</p>}
		</div>
	);
}
