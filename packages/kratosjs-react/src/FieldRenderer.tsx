import React from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { FieldRendererProps } from './types';
import { useFieldRegistry } from './contexts/FieldRegistryContext';
import { evaluateCondition } from './runtime/conditions';
import { useAfterStateUpdated } from './hooks/useAfterStateUpdated';
import { getColumnClasses } from './components/utils/layoutHelpers';
import { translate } from './i18n/activeLocale';

/**
 * FieldRenderer component
 * Dynamically renders the correct field component based on type
 */
export function FieldRenderer({
	field,
	apiBaseUrl,
	resource,
	operation,
	mode = 'edit',
	value,
}: FieldRendererProps & {
	apiBaseUrl?: string;
	resource?: string;
	operation?: 'create' | 'edit' | 'view';
	mode?: 'edit' | 'view';
	value?: any;
}) {
	const registry = useFieldRegistry();
	const FieldComponent = registry[field.type];

	// In view mode, we don't need form context
	let formState: Record<string, any> = {};
	if (mode === 'edit') {
		const { control } = useFormContext();
		// Watch form state for conditional visibility/disabled evaluation
		formState = useWatch({ control }) || {};
		// Execute afterStateUpdated callback when field value changes (if provided)
		useAfterStateUpdated(field.name, (field as any).afterStateUpdatedFn);
	} else {
		// In view mode, create a simple form state from the value prop for conditional evaluation
		// This allows conditional visibility to work based on field values
		if (field.name && value !== undefined) {
			formState = { [field.name]: value };
		}
	}

	// Unknown field type
	if (!FieldComponent) {
		console.warn(`Unknown field type: ${field.type}`);
		return (
			<div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
				<p className="text-sm text-yellow-800">
					<strong>{translate('core:common.warning')}:</strong>{' '}
					{translate('core:state.unknown_field', { type: field.type, name: field.name })}
				</p>
			</div>
		);
	}

	// Evaluate conditional hidden state — hiddenWhen is the structured-AST form
	// (no code execution), hiddenFn the serialized-function form.
	const isHidden = evaluateCondition(
		(field as any).hiddenWhen ?? (field as any).hiddenFn ?? field.hidden,
		formState,
		operation,
	);

	// Evaluate conditional disabled state
	const isDisabled = evaluateCondition(
		(field as any).disabledWhen ?? (field as any).disabledFn ?? field.disabled,
		formState,
		operation,
	);

	// Hidden field
	if (isHidden) {
		return null;
	}

	// Update field props with evaluated disabled state, API base URL, resource, mode, operation, and value
	const fieldWithEvaluatedProps = {
		...field,
		disabled: isDisabled,
		apiBaseUrl,
		resource,
		mode,
		operation,
		value: value !== undefined ? value : mode === 'view' ? undefined : undefined,
	};

	// Get column layout classes using shared helper
	const columnClasses = getColumnClasses(fieldWithEvaluatedProps.columnSpan, fieldWithEvaluatedProps.columnStart);

	// Render the field component
	if (columnClasses) {
		return (
			<div className={columnClasses}>
				<FieldComponent {...fieldWithEvaluatedProps} />
			</div>
		);
	}

	return <FieldComponent {...fieldWithEvaluatedProps} />;
}
