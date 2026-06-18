import React, { useState, KeyboardEvent } from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { FieldProps, RHFValidationRules } from '../types';
import { useValidation } from '../hooks/useValidation';
import { HintDisplay } from './utils/HintDisplay';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { cn } from '../utils/classNames';
import { X, GripVertical, List } from 'lucide-react';

/** View mode: trigger + popup when showInPopup is true */
function TagsViewPopup({ tags, renderHtml }: { tags: any[]; renderHtml: boolean }) {
	const [open, setOpen] = useState(false);
	const count = tags.length;
	const label = count === 1 ? '1 tag' : `${count} tags`;

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className={cn(
					'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
					'bg-accent-soft text-fg',
					'hover:opacity-90 transition-opacity',
				)}>
				<List className="w-4 h-4 shrink-0" />
				{label}
			</button>

			{open && (
				<>
					<div className="fixed inset-0 z-40 bg-base opacity-80" aria-hidden onClick={() => setOpen(false)} />
					<div
						role="dialog"
						aria-modal="true"
						aria-label="Tags"
						className={cn(
							'fixed left-1/2 top-1/2 z-50 w-[min(90vw,28rem)] max-h-[70vh] -translate-x-1/2 -translate-y-1/2',
							'bg-surface rounded-xl shadow-xl border border-border',
							'flex flex-col overflow-hidden',
						)}>
						<div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
							<span className="text-sm font-medium text-fg">{label}</span>
							<button
								type="button"
								onClick={() => setOpen(false)}
								className="p-1 rounded-lg text-fg-secondary hover:bg-hover transition-colors"
								aria-label="Close">
								<X className="w-5 h-5" />
							</button>
						</div>
						<div className="p-4 overflow-y-auto flex flex-wrap gap-2">
							{tags.map((tag: any, index: number) => (
								<span
									key={index}
									className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-soft text-fg">
									{renderHtml ? (
										<span
											className="kratosjshtml-content"
											dangerouslySetInnerHTML={{ __html: String(tag) }}
										/>
									) : (
										String(tag)
									)}
								</span>
							))}
						</div>
					</div>
				</>
			)}
		</>
	);
}

/**
 * TagsInput field component
 * Renders a tags input for managing arrays of simple values
 */
export function TagsInputField(props: FieldProps) {
	const {
		name,
		label,
		helperText,
		hint,
		hintIcon,
		hintColor,
		placeholder,
		disabled = false,
		mode,
		value,
		separator = ',',
		suggestions = [],
		minItems,
		maxItems,
		addable = true,
		deletable = true,
		reorderable = true,
		showInPopup = false,
	} = props;

	// Determine if field should be treated as required (for minItems fallback)
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

	const [inputValue, setInputValue] = useState('');
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	// View mode: render as comma-separated list or badges (or popup when showInPopup)
	if (mode === 'view') {
		const tags = Array.isArray(value) ? value : [];
		if (tags.length === 0) {
			return <ViewFieldWrapper label={label}>-</ViewFieldWrapper>;
		}

		const renderHtml = props.renderHtml === true;

		if (showInPopup) {
			return (
				<ViewFieldWrapper label={label}>
					<TagsViewPopup tags={tags} renderHtml={renderHtml} />
				</ViewFieldWrapper>
			);
		}

		return (
			<ViewFieldWrapper label={label}>
				<div className="flex flex-wrap gap-2">
					{tags.map((tag: any, index: number) => (
						<span
							key={index}
							className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-accent-soft text-accent">
							{renderHtml ? (
								<span
									className="kratosjshtml-content"
									dangerouslySetInnerHTML={{ __html: String(tag) }}
								/>
							) : (
								String(tag)
							)}
						</span>
					))}
				</div>
			</ViewFieldWrapper>
		);
	}

	const { control } = useFormContext();
	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);

	// Additional validation for minItems/maxItems
	const tagsValidation: RHFValidationRules = React.useMemo(() => {
		const rules: RHFValidationRules = { ...validation };

		if (effectiveMinItems && effectiveMinItems > 0) {
			rules.validate = {
				...(rules.validate || {}),
				minItems: (value: any) => {
					const length = Array.isArray(value) ? value.length : 0;
					return length >= effectiveMinItems || `At least ${effectiveMinItems} item(s) are required`;
				},
			};
		}

		if (maxItems && maxItems > 0) {
			rules.validate = {
				...(rules.validate || {}),
				maxItems: (value: any) => {
					const length = Array.isArray(value) ? value.length : 0;
					return length <= maxItems || `Maximum ${maxItems} item(s) allowed`;
				},
			};
		}

		return rules;
	}, [validation, effectiveMinItems, maxItems]);

	return (
		<Controller
			name={name}
			control={control}
			rules={tagsValidation}
			render={({ field: { value: fieldValue, onChange }, fieldState: { error } }) => {
				const tags: string[] = Array.isArray(fieldValue) ? fieldValue : [];
				const hasError = !!error;

				const addTag = (tag: string) => {
					const trimmedTag = tag.trim();
					if (!trimmedTag) return;
					if (tags.includes(trimmedTag)) return;
					if (maxItems && tags.length >= maxItems) return;

					onChange([...tags, trimmedTag]);
					setInputValue('');
				};

				const removeTag = (index: number) => {
					if (!deletable || disabled) return;
					if (effectiveMinItems && tags.length <= effectiveMinItems) return;

					const newTags = tags.filter((_, i) => i !== index);
					onChange(newTags);
				};

				const handleDragStart = (e: React.DragEvent<HTMLSpanElement>, index: number) => {
					if (!reorderable || disabled) return;
					setDraggedIndex(index);
					e.dataTransfer.effectAllowed = 'move';
				};

				const handleDragOver = (e: React.DragEvent<HTMLSpanElement>, index: number) => {
					if (!reorderable || disabled || draggedIndex === null) return;
					e.preventDefault();
					e.dataTransfer.dropEffect = 'move';
					setDragOverIndex(index);
				};

				const handleDragLeave = () => {
					setDragOverIndex(null);
				};

				const handleDrop = (e: React.DragEvent<HTMLSpanElement>, dropIndex: number) => {
					if (!reorderable || disabled || draggedIndex === null) return;
					e.preventDefault();

					if (draggedIndex === dropIndex) {
						setDraggedIndex(null);
						setDragOverIndex(null);
						return;
					}

					const newTags = [...tags];
					const [movedTag] = newTags.splice(draggedIndex, 1);
					newTags.splice(dropIndex, 0, movedTag);

					onChange(newTags);
					setDraggedIndex(null);
					setDragOverIndex(null);
				};

				const handleDragEnd = () => {
					setDraggedIndex(null);
					setDragOverIndex(null);
				};

				const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
					if (e.key === 'Enter' || e.key === separator) {
						e.preventDefault();
						addTag(inputValue);
					} else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
						// Remove last tag when backspace on empty input
						removeTag(tags.length - 1);
					}
				};

				const handleBlur = () => {
					// Add remaining input as tag on blur
					if (inputValue.trim()) {
						addTag(inputValue);
					}
					setShowSuggestions(false);
				};

				const filteredSuggestions = suggestions.filter(
					s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s),
				);

				const canAdd = addable && !disabled && (maxItems === undefined || tags.length < maxItems);

				return (
					<div className="mb-4">
						{label && (
							<label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
								{label}
								{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
							</label>
						)}

						<div
							className={cn(
								'w-full min-h-[42px] px-3 py-2 border rounded-lg shadow-sm',
								'k-input',
								'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring ',
								'transition duration-150 ease-in-out',
								hasError &&
									'border-red-500 dark:border-red-400 focus-within:ring-red-500 dark:focus-within:ring-red-400',
								disabled && 'opacity-60 cursor-not-allowed',
							)}>
							<div className="flex flex-wrap gap-2 items-center">
								{/* Tags */}
								{tags.map((tag, index) => (
									<span
										key={index}
										draggable={reorderable && !disabled}
										onDragStart={e => handleDragStart(e, index)}
										onDragOver={e => handleDragOver(e, index)}
										onDragLeave={handleDragLeave}
										onDrop={e => handleDrop(e, index)}
										onDragEnd={handleDragEnd}
										className={cn(
											'inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-medium bg-accent-soft text-accent',
											'transition-all duration-150',
											reorderable && !disabled && 'cursor-move hover:bg-accent/20',
											draggedIndex === index && 'opacity-50',
											dragOverIndex === index &&
												draggedIndex !== index &&
												'scale-105 ring-2 ring-ring',
										)}>
										{reorderable && !disabled && <GripVertical className="w-3 h-3 opacity-40" />}
										{String(tag)}
										{deletable &&
											!disabled &&
											(!effectiveMinItems || tags.length > effectiveMinItems) && (
												<button
													type="button"
													onClick={() => removeTag(index)}
													className="ml-1 hover:bg-accent/20 rounded-full p-0.5 transition-colors"
													aria-label={`Remove ${tag}`}>
													<X className="w-3 h-3" />
												</button>
											)}
									</span>
								))}

								{/* Input */}
								{canAdd && (
									<input
										type="text"
										value={inputValue}
										onChange={e => {
											setInputValue(e.target.value);
											if (suggestions.length > 0) {
												setShowSuggestions(true);
											}
										}}
										onKeyDown={handleKeyDown}
										onBlur={handleBlur}
										onFocus={() => {
											if (suggestions.length > 0) {
												setShowSuggestions(true);
											}
										}}
										placeholder={
											tags.length === 0
												? placeholder || `Enter values separated by ${separator}`
												: ''
										}
										disabled={disabled}
										className="flex-1 min-w-[120px] outline-none bg-transparent"
									/>
								)}
							</div>

							{/* Suggestions Dropdown */}
							{showSuggestions && filteredSuggestions.length > 0 && (
								<div className="relative">
									<div className="absolute z-10 mt-2 w-full bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
										{filteredSuggestions.map((suggestion, index) => (
											<button
												key={index}
												type="button"
												onMouseDown={e => e.preventDefault()}
												onClick={() => {
													addTag(suggestion);
													setShowSuggestions(false);
												}}
												className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm transition-colors">
												{suggestion}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						{hasError && (
							<p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>
						)}

						{helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>}

						{!hasError && <HintDisplay hint={hint} hintIcon={hintIcon} hintColor={hintColor} />}

						{/* Min/Max Info */}
						{(effectiveMinItems !== undefined || maxItems !== undefined) && (
							<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
								{effectiveMinItems !== undefined && `Minimum: ${effectiveMinItems}`}
								{effectiveMinItems !== undefined && maxItems !== undefined && ' • '}
								{maxItems !== undefined && `Maximum: ${maxItems}`}
							</p>
						)}
					</div>
				);
			}}
		/>
	);
}
