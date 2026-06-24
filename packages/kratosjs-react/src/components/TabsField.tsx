import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFormContext, FieldErrors, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { FieldRenderer } from '../FieldRenderer';
import { Icon } from './utils/Icon';
import { getFieldLayoutClasses } from './utils/layoutHelpers';
import { cn } from '../utils/classNames';
import { SerializedComponent } from '@maxal_studio/kratosjs';
import { evaluateCondition } from '../runtime/conditions';
import { getChildComponents, isArrayScope, someComponent } from '../runtime/formTraversal';
import { translate } from '../i18n/activeLocale';

const isEmptyValue = (value: any): boolean => value === undefined || value === null || value === '';

/**
 * Recursively check if a component or its nested components have validation errors.
 * Generic over the children contract — works for any container, including plugins.
 */
function hasComponentErrors(component: SerializedComponent, errors: FieldErrors): boolean {
	return someComponent(component, node => {
		if (!node.name) return false;
		const fieldError: any = getFieldError(errors, node.name as string);
		if (!fieldError) return false;

		// Array-scope containers (repeaters): the array itself or any item may have errors.
		if (isArrayScope(node)) {
			if (Array.isArray(fieldError)) {
				return fieldError.some(itemErrors => itemErrors && Object.keys(itemErrors).length > 0);
			}
			return Object.keys(fieldError).length > 0;
		}

		// Ignore pure "required" errors here; required-emptiness is handled separately
		// (based on current values) so a filled field doesn't keep its tab marked.
		return fieldError.type !== 'required';
	});
}

/**
 * Check if a tab has any validation errors in its schema
 */
function hasTabErrors(tabSchema: SerializedComponent[], errors: FieldErrors): boolean {
	return tabSchema.some(component => hasComponentErrors(component, errors));
}

/**
 * Check if a component is required
 */
/**
 * Check if a component is required, evaluating conditional required logic
 */
function isComponentRequired(
	component: SerializedComponent,
	formValues: Record<string, any>,
	operation?: 'create' | 'edit' | 'view',
): boolean {
	// Check direct required property
	const requiredProp = (component as any).required;

	// If required is a boolean
	if (typeof requiredProp === 'boolean') {
		return requiredProp;
	}

	// If required is a function (serialized), evaluate it
	if (typeof requiredProp === 'string') {
		return evaluateCondition(requiredProp, formValues, operation);
	}

	// Check validation rules for 'required' on the serialized validation object
	const validation = (component as any).validation as { rules?: Array<string | { rule?: string }> } | undefined;
	if (validation && Array.isArray(validation.rules)) {
		// Check for simple 'required' string rule
		if (validation.rules.some(rule => rule === 'required')) {
			return true;
		}

		// Check for conditional required rule objects
		for (const rule of validation.rules) {
			if (typeof rule === 'object' && (rule as any).rule === 'required') {
				// If there's a condition function, evaluate it
				const condition = (rule as any).condition;
				if (typeof condition === 'string') {
					return evaluateCondition(condition, formValues, operation);
				}
				return true;
			}
		}
	}

	return false;
}

/**
 * Recursively check if a component (or its descendants) is required and empty.
 * Generic over the children contract.
 */
function hasRequiredEmptyField(
	component: SerializedComponent,
	formValues: Record<string, any>,
	operation?: 'create' | 'edit' | 'view',
): boolean {
	return someComponent(component, node => {
		if (!node.name) return false;

		// Array-scope containers (repeaters): check required-empty fields within each item.
		if (isArrayScope(node)) {
			const items = formValues[node.name as string];
			if (!Array.isArray(items)) return false;
			const template = getChildComponents(node);
			return items.some(item =>
				template.some(
					field =>
						field.name &&
						isComponentRequired(field, item, operation) &&
						isEmptyValue(item[field.name as string]),
				),
			);
		}

		if (isComponentRequired(node, formValues, operation)) {
			return isEmptyValue(formValues[node.name as string]);
		}
		return false;
	});
}

/**
 * Check if a tab has any required empty fields
 */
function hasRequiredEmptyFieldsInTab(
	tabSchema: SerializedComponent[],
	formValues: Record<string, any>,
	operation?: 'create' | 'edit' | 'view',
): boolean {
	return tabSchema.some(component => hasRequiredEmptyField(component, formValues, operation));
}

export function TabsField({
	schema: tabNodes,
	defaultTab = 0,
	columns,
	mode,
	disabled,
	value,
	_recordData,
	description,
	operation,
	...props
}: FieldProps & {
	/** Tab child components (each a serialized `tab` node with label/icon/schema). */
	schema?: SerializedComponent[];
	defaultTab?: number;
	_recordData?: any;
	operation?: 'create' | 'edit' | 'view';
}) {
	const [activeTab, setActiveTab] = useState(defaultTab);
	const isViewMode = mode === 'view';

	// Inherit API configuration from parent so nested fields (e.g. FileUpload) work inside tabs
	const apiBaseUrl = (props as any).apiBaseUrl as string | undefined;
	const resource = (props as any).resource as string | undefined;

	// Get form context for validation errors and values (only in edit mode)
	const formContext = mode === 'edit' ? useFormContext() : null;
	const errors = formContext?.formState?.errors || {};
	const submitCount = formContext?.formState?.submitCount ?? 0;
	// Validation indicators (red dots) only appear after a submit attempt, so they
	// never nag while the user is still filling the form.
	const hasSubmitted = submitCount > 0;
	// Use useWatch to get reactive form values
	const formValues = mode === 'edit' && formContext ? useWatch({ control: formContext.control }) || {} : {};

	// Normalize the serialized `tab` child nodes into render-friendly tab descriptors.
	const tabs = useMemo(
		() =>
			(Array.isArray(tabNodes) ? tabNodes : []).map((node: any) => ({
				label: node.label as string,
				icon: node.icon as string | undefined,
				schema: getChildComponents(node),
			})),
		[tabNodes],
	);

	// Find tabs with errors
	const tabsWithErrors = useMemo(() => {
		if (!tabs || isViewMode) return new Set<number>();

		const errorTabs = new Set<number>();
		tabs.forEach((tab, index) => {
			if (hasTabErrors(tab.schema || [], errors)) {
				errorTabs.add(index);
			}
		});
		return errorTabs;
	}, [tabs, errors, isViewMode]);

	// Find tabs with required empty fields
	const tabsWithRequiredEmpty = useMemo(() => {
		if (!tabs || isViewMode) return new Set<number>();

		const requiredTabs = new Set<number>();
		tabs.forEach((tab, index) => {
			if (hasRequiredEmptyFieldsInTab(tab.schema || [], formValues, operation)) {
				requiredTabs.add(index);
			}
		});
		return requiredTabs;
	}, [tabs, formValues, isViewMode, operation]);

	// Auto-open the first tab with validation errors — exactly ONCE per submit attempt.
	// Keying on submitCount (not activeTab/errors) means the jump happens when the user
	// submits and never again, so manual navigation afterwards is never hijacked.
	const lastHandledSubmit = useRef(0);
	useEffect(() => {
		if (isViewMode || submitCount === 0 || submitCount === lastHandledSubmit.current) return;
		lastHandledSubmit.current = submitCount;

		const firstErrorTab = tabs.findIndex((_tab, index) => tabsWithErrors.has(index));
		if (firstErrorTab !== -1) {
			setActiveTab(firstErrorTab);
		}
	}, [submitCount, tabs, tabsWithErrors, isViewMode]);

	// In view mode, use _recordData if provided, otherwise use value
	const recordData = mode === 'view' && _recordData ? _recordData : value || {};

	// Layout classes for tab field stacks
	const fieldLayoutClasses = getFieldLayoutClasses(columns);

	if (!tabs || tabs.length === 0) {
		return null;
	}

	// In view mode, show tabs (read-only but can switch tabs)
	if (isViewMode) {
		return (
			<div className="mb-6">
				{description && <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{description}</p>}

				{/* Tab Headers */}
				<div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
					{tabs.map((tab, index) => (
						<button
							key={index}
							type="button"
							onClick={() => setActiveTab(index)}
							className={cn(
								'px-4 py-2 font-medium text-sm whitespace-nowrap',
								'border-b-2 -mb-px',
								'focus:none',
								activeTab === index
									? 'border-accent text-accent'
									: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
							)}
							aria-selected={activeTab === index}
							role="tab">
							<span className="inline-flex items-center gap-2">
								{tab.icon && <Icon name={tab.icon} className="w-4 h-4" />}
								{tab.label}
							</span>
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div>
					{tabs[activeTab] && (
						<div className={fieldLayoutClasses}>
							{tabs[activeTab].schema?.map((field: any, fieldIndex: number) => {
								// Determine if this nested field/layout needs full record data context
								const needsRecordData =
									Boolean((field as any).needsRecordData) ||
									Boolean(field.schema && Array.isArray(field.schema));

								const nestedField = {
									...field,
									disabled: disabled || field.disabled,
									mode: mode || field.mode,
									...(needsRecordData && recordData ? { _recordData: recordData } : {}),
								};

								// For simple leaf fields with a name, pass their direct value in view mode
								const nestedValue =
									mode === 'view' && field.name && !needsRecordData
										? recordData[field.name]
										: undefined;

								return (
									<FieldRenderer
										key={fieldIndex}
										field={nestedField}
										mode={mode}
										value={nestedValue}
										apiBaseUrl={apiBaseUrl}
										resource={resource}
										operation={operation}
									/>
								);
							})}
						</div>
					)}
				</div>
			</div>
		);
	}

	// Edit mode: render tabs with navigation
	// Render all tabs but hide inactive ones so React Hook Form can validate them
	return (
		<div className="my-6">
			{description && <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{description}</p>}

			{/* Tab Headers */}
			<div className="flex border-b border-gray-200 dark:border-gray-700 mb-4 overflow-x-auto">
				{tabs.map((tab, index) => {
					// Only flag tabs after a submit attempt, so the indicator reflects a real
					// failed validation rather than nagging while the user is still filling in.
					const showIndicator =
						hasSubmitted && (tabsWithErrors.has(index) || tabsWithRequiredEmpty.has(index));
					return (
						<button
							key={index}
							type="button"
							onClick={() => setActiveTab(index)}
							disabled={disabled}
							className={cn(
								'px-4 py-2 font-medium text-sm transition-colors whitespace-nowrap relative',
								'border-b-2 -mb-px',
								'focus:none',
								disabled && 'opacity-60 cursor-not-allowed',
								activeTab === index
									? 'border-accent text-accent '
									: 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200',
								showIndicator && activeTab !== index && 'text-red-600 dark:text-red-400',
							)}
							aria-selected={activeTab === index}
							role="tab">
							<span className="inline-flex items-center gap-2">
								{tab.icon && <Icon name={tab.icon} className="w-4 h-4" />}
								{tab.label}
								{showIndicator && (
									<span
										className="ml-1 w-2 h-2 rounded-full bg-red-500 dark:bg-red-400"
										aria-label={translate('core:a11y.tab_errors')}
									/>
								)}
							</span>
						</button>
					);
				})}
			</div>

			{/* Tab Content - Render all tabs but hide inactive ones for validation */}
			{tabs.map((tab, tabIndex) => (
				<div
					key={tabIndex}
					role="tabpanel"
					aria-labelledby={`tab-${tabIndex}`}
					className={activeTab === tabIndex ? '' : 'hidden'}>
					<div className={fieldLayoutClasses}>
						{tab.schema?.map((field: any, fieldIndex: number) => {
							// Propagate disabled state and mode to nested fields
							const nestedField = {
								...field,
								disabled: disabled || field.disabled,
								mode: mode || field.mode,
							};
							return (
								<FieldRenderer
									key={fieldIndex}
									field={nestedField}
									mode={mode}
									apiBaseUrl={apiBaseUrl}
									resource={resource}
									operation={operation}
								/>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
