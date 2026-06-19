import React, { useState } from 'react';
import { useFormContext, useFieldArray, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps, RHFValidationRules } from '../types';
import { FieldRenderer } from '../FieldRenderer';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { PillButton } from './ui/PillButton';

export function RepeaterField(props: FieldProps) {
	const {
		name,
		label,
		helperText,
		hint,
		hintIcon,
		hintColor,
		schema = [],
		defaultItems = 0,
		minItems,
		maxItems,
		addable = true,
		deletable = true,
		reorderable = true,
		itemLabel,
		disabled = false,
		collapsible = false,
		mode,
		value,
		operation,
	} = props;

	// Threaded down so nested fields (e.g. relation selects, file uploads) can reach the API.
	const apiBaseUrl = (props as any).apiBaseUrl as string | undefined;
	const resource = (props as any).resource as string | undefined;

	// Determine if repeater should be treated as required (for minItems fallback)
	let isRequired = props.required === true;
	const validationRules = (props.validation as { rules?: Array<string | { rule?: string }> } | undefined)?.rules;
	if (validationRules && Array.isArray(validationRules)) {
		if (
			validationRules.some(
				rule => rule === 'required' || (typeof rule === 'object' && (rule as any).rule === 'required'),
			)
		) {
			isRequired = true;
		}
	}

	// Effective minItems: honor explicit minItems, otherwise infer from required
	const effectiveMinItems = minItems !== undefined ? minItems : isRequired ? 1 : undefined;

	// View mode: render formatted display
	if (mode === 'view') {
		const items = Array.isArray(value) ? value : [];
		if (items.length === 0) {
			return <ViewFieldWrapper label={label}>-</ViewFieldWrapper>;
		}

		return (
			<ViewFieldWrapper label={label}>
				<div className="space-y-4">
					{items.map((item: any, index: number) => (
						<div key={index} className="border border-border rounded-lg p-4 bg-surface">
							{itemLabel && (
								<div className="font-medium text-fg-secondary mb-3">
									{itemLabel} {index + 1}
								</div>
							)}
							<div className="space-y-3">
								{schema.map((field: any, fieldIndex: number) => {
									const fieldValue = field.name ? item[field.name] : undefined;
									return (
										<FieldRenderer
											key={fieldIndex}
											field={{ ...field, mode: 'view' }}
											mode="view"
											value={fieldValue}
											operation={operation ?? 'view'}
											apiBaseUrl={apiBaseUrl}
											resource={resource}
										/>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</ViewFieldWrapper>
		);
	}

	const formContext = useFormContext();
	const { control, register } = formContext;
	const errors = formContext.formState?.errors || {};

	const { fields, append, remove, move } = useFieldArray({
		control,
		name,
	});

	// Track active tab (for non-collapsible mode)
	const [activeTab, setActiveTab] = useState<number>(0);

	// Track collapsed state for each item (for collapsible mode)
	const [collapsedItems, setCollapsedItems] = useState<Set<number>>(new Set());

	// Default items are handled by FormRenderer's extractDefaultValues.
	// We do not auto-add placeholders for minItems here, to avoid off-by-one
	// issues and keep the UI strictly in sync with the actual form state.

	// Ensure active tab is valid
	React.useEffect(() => {
		if (activeTab >= fields.length && fields.length > 0) {
			setActiveTab(fields.length - 1);
		}
	}, [fields.length, activeTab]);

	const canAdd = addable && !disabled && (maxItems === undefined || fields.length < maxItems);
	const canDelete = (index: number) =>
		deletable && !disabled && (effectiveMinItems === undefined || fields.length > effectiveMinItems);
	const canMoveUp = (index: number) => reorderable && !disabled && index > 0;
	const canMoveDown = (index: number) => reorderable && !disabled && index < fields.length - 1;

	const handleDelete = (index: number) => {
		if (canDelete(index)) {
			remove(index);
			// Switch to previous tab if deleting active tab
			if (activeTab >= index && activeTab > 0) {
				setActiveTab(activeTab - 1);
			}
		}
	};

	const handleMoveUp = (index: number) => {
		if (canMoveUp(index)) {
			move(index, index - 1);
			// Update active tab if moving the active item
			if (activeTab === index) {
				setActiveTab(index - 1);
			} else if (activeTab === index - 1) {
				setActiveTab(index);
			}
		}
	};

	const handleMoveDown = (index: number) => {
		if (canMoveDown(index)) {
			move(index, index + 1);
			// Update active tab if moving the active item
			if (activeTab === index) {
				setActiveTab(index + 1);
			} else if (activeTab === index + 1) {
				setActiveTab(index);
			}
		}
	};

	const handleAdd = () => {
		if (canAdd) {
			append({});
			if (!collapsible) {
				setActiveTab(fields.length); // Switch to the newly added tab
			}
		}
	};

	const toggleCollapse = (index: number) => {
		setCollapsedItems(prev => {
			const newSet = new Set(prev);
			if (newSet.has(index)) {
				newSet.delete(index);
			} else {
				newSet.add(index);
			}
			return newSet;
		});
	};

	// Watch all repeater items for dynamic labels
	const watchedItems = useWatch({
		control,
		name: name,
		defaultValue: [],
	});

	// Helper function to get dynamic label for an item
	const getItemLabel = (index: number): string => {
		// Default label format
		const baseLabel = itemLabel || 'Item';

		// Check if itemLabel has a field name specified (e.g., "Product: {name}")
		if (typeof itemLabel === 'string' && itemLabel.includes('{') && itemLabel.includes('}')) {
			const match = itemLabel.match(/\{([^}]+)\}/);
			if (match) {
				const fieldName = match[1];
				const template = itemLabel;

				// Get the field value from watched items
				const item = watchedItems?.[index];
				const fieldValue = item?.[fieldName];

				// Replace {fieldName} with actual value
				if (fieldValue) {
					return template.replace(/\{[^}]+\}/, fieldValue);
				}
				// If no value, show placeholder
				return template.replace(/\{[^}]+\}/, `#${index + 1}`);
			}
		}

		// Fallback to numbered format
		return `${baseLabel} ${index + 1}`;
	};

	// Validation for repeater as a whole (min items / required)
	const repeaterValidation: RHFValidationRules = React.useMemo(() => {
		const rules: RHFValidationRules = {};
		if (effectiveMinItems && effectiveMinItems > 0) {
			rules.validate = {
				minItems: (value: any) => {
					const length = Array.isArray(value) ? value.length : 0;
					return length >= effectiveMinItems || `At least ${effectiveMinItems} item(s) are required`;
				},
			};
		}
		return rules;
	}, [effectiveMinItems]);

	const repeaterError = getFieldError(errors, name);

	return (
		<div className="space-y-4">
			{/* Hidden field to attach validation for minItems / required */}
			<input type="hidden" {...register(name, repeaterValidation)} />
			{/* Label and Description */}
			{label && (
				<div className="mb-4">
					<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
					{helperText && <p className="text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}
					<HintDisplay hint={hint} hintIcon={hintIcon} hintColor={hintColor} />
				</div>
			)}

			{fields.length === 0 ? (
				/* Empty State */
				<div className="text-center py-12 text-fg-secondary text-sm border-2 border-dashed border-border rounded-lg bg-muted">
					<svg
						className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24">
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p className="mb-4">No items yet. Click the button below to add one.</p>
				</div>
			) : collapsible ? (
				/* Collapsible/Accordion Mode */
				<div className="space-y-3">
					{fields.map((field, index) => {
						const displayLabel = getItemLabel(index);
						const isCollapsed = collapsedItems.has(index);

						return (
							<div
								key={field.id}
								className="border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
								{/* Collapsible Header */}
								<div className="flex items-center bg-muted border-b border-border">
									{/* Collapse/Expand Button */}
									<button
										type="button"
										onClick={() => toggleCollapse(index)}
										className="flex items-center flex-1 px-4 py-3 text-sm font-medium text-fg hover:bg-hover transition-colors text-left">
										<svg
											className={`w-5 h-5 mr-2 transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24">
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M9 5l7 7-7 7"
											/>
										</svg>
										<span>{displayLabel}</span>
									</button>

									{/* Action Buttons */}
									<div className="flex items-center gap-1 px-2 py-2 border-l border-border">
										{/* Move Up Button */}
										{reorderable && (
											<button
												type="button"
												onClick={() => handleMoveUp(index)}
												disabled={!canMoveUp(index)}
												className="p-2 text-fg-secondary hover:text-fg hover:bg-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
												aria-label="Move up"
												title="Move up">
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M5 15l7-7 7 7"
													/>
												</svg>
											</button>
										)}

										{/* Move Down Button */}
										{reorderable && (
											<button
												type="button"
												onClick={() => handleMoveDown(index)}
												disabled={!canMoveDown(index)}
												className="p-2 text-fg-secondary hover:text-fg hover:bg-hover rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
												aria-label="Move down"
												title="Move down">
												<svg
													className="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24">
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M19 9l-7 7-7-7"
													/>
												</svg>
											</button>
										)}

										{/* Delete Button */}
										<button
											type="button"
											onClick={() => handleDelete(index)}
											disabled={!canDelete(index)}
											className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
											aria-label="Delete"
											title="Delete">
											<svg
												className="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24">
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</button>
									</div>
								</div>

								{/* Collapsible Content */}
								{!isCollapsed && (
									<div className="p-6">
										<div className="space-y-4">
											{schema.map((fieldSchema: any) => {
												const nestedField = {
													...fieldSchema,
													name: `${name}.${index}.${fieldSchema.name}`,
												};
												return (
													<FieldRenderer
														key={fieldSchema.name}
														field={nestedField}
														operation={operation}
														apiBaseUrl={apiBaseUrl}
														resource={resource}
													/>
												);
											})}
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			) : (
				/* Tab Mode (Original) */
				<div className="border border-border rounded-lg bg-surface shadow-sm overflow-hidden">
					{/* Tab Headers */}
					<div className="flex items-center bg-muted border-b border-border overflow-x-auto">
						<div className="flex flex-1 min-w-0">
							{fields.map((field, index) => {
								const displayLabel = getItemLabel(index);
								const isActive = activeTab === index;

								return (
									<button
										key={field.id}
										type="button"
										onClick={() => setActiveTab(index)}
										className={`
											flex items-center px-4 py-3 text-sm font-medium border-r border-border whitespace-nowrap transition-colors
											${
												isActive
													? 'bg-surface text-accent border-b-2 border-b-accent -mb-px'
													: 'text-fg-secondary hover:text-fg hover:bg-hover'
											}
										`}>
										<span className="mr-2">{displayLabel}</span>
										{isActive && (
											<span
												className="w-2 h-2 bg-accent rounded-full"
												aria-label="Active tab"></span>
										)}
									</button>
								);
							})}
						</div>

						{/* Action Buttons in Header */}
						<div className="flex items-center gap-1 px-2 py-2 border-l border-border bg-muted">
							{/* Move Left Button */}
							{reorderable && (
								<button
									type="button"
									onClick={() => handleMoveUp(activeTab)}
									disabled={!canMoveUp(activeTab)}
									className="p-2 text-fg-secondary hover:text-fg hover:bg-hover rounded disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors"
									aria-label="Move left"
									title="Move left">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M15 19l-7-7 7-7"
										/>
									</svg>
								</button>
							)}

							{/* Move Right Button */}
							{reorderable && (
								<button
									type="button"
									onClick={() => handleMoveDown(activeTab)}
									disabled={!canMoveDown(activeTab)}
									className="p-2 text-fg-secondary hover:text-fg hover:bg-hover rounded disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors"
									aria-label="Move right"
									title="Move right">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</button>
							)}

							{/* Delete Button */}
							<button
								type="button"
								onClick={() => handleDelete(activeTab)}
								disabled={!canDelete(activeTab)}
								className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none transition-colors"
								aria-label="Delete"
								title="Delete">
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						</div>
					</div>

					{/* Tab Content */}
					<div className="p-6">
						{fields.map((field, index) => (
							<div key={field.id} className={activeTab === index ? 'block' : 'hidden'}>
								<div className="space-y-4">
									{schema.map((fieldSchema: any) => {
										// Create a namespaced field for the nested schema
										const nestedField = {
											...fieldSchema,
											name: `${name}.${index}.${fieldSchema.name}`,
											disabled: disabled || fieldSchema.disabled, // Propagate disabled state
										};
										return (
											<FieldRenderer
												key={fieldSchema.name}
												field={nestedField}
												operation={operation}
												apiBaseUrl={apiBaseUrl}
												resource={resource}
											/>
										);
									})}
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Add Button */}
			<PillButton
				type="button"
				onClick={handleAdd}
				disabled={!canAdd}
				className="w-full border-accent/30 bg-accent-soft text-accent hover:bg-accent-soft">
				<span className="flex items-center justify-center">
					<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					Add
					{maxItems !== undefined && ` (${fields.length}/${maxItems})`}
				</span>
			</PillButton>

			{/* Min/Max Info */}
			{(minItems !== undefined || maxItems !== undefined) && (
				<p className="text-xs text-gray-500 dark:text-gray-400 text-center">
					{minItems !== undefined && `Minimum: ${minItems}`}
					{minItems !== undefined && maxItems !== undefined && ' • '}
					{maxItems !== undefined && `Maximum: ${maxItems}`}
				</p>
			)}
		</div>
	);
}
