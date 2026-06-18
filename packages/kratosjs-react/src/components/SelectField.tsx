import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { getFieldError } from '../utils/fieldErrors';
import { FieldProps } from '../types';
import { useValidation } from '../hooks/useValidation';
import { cn } from '../utils/classNames';
import { HintDisplay } from './utils/HintDisplay';
import { Icon } from './utils/Icon';
import { ResourceFormModal } from './modals/ResourceFormModal';
import { executeSerializedFunction } from '../runtime/serializedFunctions';
import { ViewFieldWrapper } from './utils/ViewFieldWrapper';
import { formatSelectLabel } from '../utils/formatValue';
import { authenticatedFetch } from '../api/authenticatedFetch';

/**
 * Component for rendering SelectField in view mode with relationship data fetching
 */
function SelectFieldViewMode({
	value,
	isMultiple,
	relationship,
	label,
	optionLabelFormatter,
	apiBaseUrl,
}: {
	value: any;
	isMultiple: boolean;
	relationship: NonNullable<FieldProps['relationship']>;
	label?: string;
	optionLabelFormatter?: any;
	apiBaseUrl?: string;
}) {
	const [displayValue, setDisplayValue] = useState<string>('-');
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const fetchRelationshipData = async () => {
			if (!value || (isMultiple && (!Array.isArray(value) || value.length === 0))) {
				setDisplayValue('-');
				return;
			}

			// Extract IDs from value
			const valueIds = isMultiple
				? (Array.isArray(value) ? value : []).map((v: any) => {
						if (typeof v === 'object' && v !== null) {
							return v._id || v.id || String(v);
						}
						return String(v);
					})
				: typeof value === 'object' && value !== null
					? [value._id || value.id || String(value)]
					: [String(value)];

			if (valueIds.length === 0) {
				setDisplayValue('-');
				return;
			}

			// If all values are already objects with titleAttribute, use them directly
			if (isMultiple && Array.isArray(value)) {
				const allHaveTitle = value.every(
					(v: any) => typeof v === 'object' && v !== null && v[relationship.titleAttribute],
				);
				if (allHaveTitle) {
					const formatted = value
						.map((v: any) => {
							const title = v[relationship.titleAttribute] || String(v);
							if (optionLabelFormatter) {
								const formattedTitle = executeSerializedFunction(
									optionLabelFormatter,
									v._id || v.id || String(v),
									v,
								);
								return formattedTitle !== null && formattedTitle !== undefined
									? String(formattedTitle)
									: title;
							}
							return title;
						})
						.join(', ');
					setDisplayValue(formatted);
					return;
				}
			} else if (
				!isMultiple &&
				typeof value === 'object' &&
				value !== null &&
				value[relationship.titleAttribute]
			) {
				const title = value[relationship.titleAttribute];
				if (optionLabelFormatter) {
					const formattedTitle = executeSerializedFunction(
						optionLabelFormatter,
						value._id || value.id || String(value),
						value,
					);
					setDisplayValue(
						formattedTitle !== null && formattedTitle !== undefined ? String(formattedTitle) : title,
					);
				} else {
					setDisplayValue(title);
				}
				return;
			}

			// Need to fetch records
			setIsLoading(true);
			try {
				const resourceSlug = relationship.resource || relationship.name;
				const apiUrl = apiBaseUrl || '/kratosjs/api';
				const fetchPromises = valueIds.map(async (id: string) => {
					try {
						const response = await authenticatedFetch(
							`${apiUrl}/${resourceSlug}/${id}`,
							{
								headers: {},
							},
							apiUrl.substring(0, apiUrl.lastIndexOf('/')),
						);
						if (response.ok) {
							const result = await response.json();
							const record = result.data || result;
							return { id, record };
						}
					} catch (error) {
						console.error(`Error fetching record ${id}:`, error);
					}
					return null;
				});

				const results = await Promise.all(fetchPromises);
				const validResults = results.filter((r): r is { id: string; record: any } => r !== null);

				if (validResults.length === 0) {
					setDisplayValue(valueIds.join(', '));
					return;
				}

				// Format the display value
				const formatted = validResults
					.map(({ id, record }) => {
						const title = record[relationship.titleAttribute] || id;
						if (optionLabelFormatter) {
							const formattedTitle = executeSerializedFunction(optionLabelFormatter, id, record);
							return formattedTitle !== null && formattedTitle !== undefined
								? String(formattedTitle)
								: title;
						}
						return title;
					})
					.join(', ');

				setDisplayValue(formatted);
			} catch (error) {
				console.error('Error fetching relationship data:', error);
				// Fallback to showing IDs
				setDisplayValue(valueIds.join(', '));
			} finally {
				setIsLoading(false);
			}
		};

		fetchRelationshipData();
	}, [value, isMultiple, relationship, optionLabelFormatter, apiBaseUrl]);

	if (isLoading) {
		return (
			<ViewFieldWrapper label={label}>
				<span className="text-fg-secondary">Loading...</span>
			</ViewFieldWrapper>
		);
	}

	return (
		<ViewFieldWrapper label={label}>
			<span dangerouslySetInnerHTML={{ __html: displayValue || '-' }} />
		</ViewFieldWrapper>
	);
}

/**
 * Select field component
 * Renders single or multi-select dropdowns with optional creatable functionality
 * Supports relationship-based data fetching from API
 */
export function SelectField(props: FieldProps) {
	// View mode: render formatted display
	if (props.mode === 'view') {
		const value = props.value;
		const isMultiple = props.isMultiple || props.multiple;
		const hasRelationship = !!props.relationship;

		// For relationship-based selects, we need to fetch the related records if value is just an ID
		if (hasRelationship && props.relationship) {
			// Use a component that fetches relationship data
			return (
				<SelectFieldViewMode
					value={value}
					isMultiple={isMultiple}
					relationship={props.relationship}
					label={props.label}
					optionLabelFormatter={props.optionLabelFormatter}
					apiBaseUrl={(props as any).apiBaseUrl}
				/>
			);
		}

		// For non-relationship selects, use static options
		const displayValue = formatSelectLabel(value, props.options, isMultiple);
		return <ViewFieldWrapper label={props.label}>{displayValue}</ViewFieldWrapper>;
	}

	const {
		register,
		setValue,
		control,
		formState: { errors },
	} = useFormContext();

	const validation = useValidation(props.validation?.rules || [], props.operation, props.name);
	const error = getFieldError(errors, props.name);
	const hasError = !!error;
	const isMultiple = props.isMultiple || props.multiple;
	const isCreatable = props.creatable;
	const isNative = props.native;
	const hasRelationship = !!props.relationship;

	// Watch current value for multi-select - let the form handle defaults
	const rawValue = useWatch({ control, name: props.name });

	// Normalize value: if it's an object (from edit mode), extract the ID
	const normalizeValue = (value: any): string | string[] | '' => {
		if (!value) return isMultiple ? [] : '';

		if (isMultiple) {
			if (!Array.isArray(value)) return [];
			return value.map((v: any) => {
				if (typeof v === 'object' && v !== null) {
					return v._id || v.id || String(v);
				}
				return String(v);
			});
		} else {
			if (typeof value === 'object' && value !== null) {
				return value._id || value.id || String(value);
			}
			return String(value);
		}
	};

	const currentValue = normalizeValue(rawValue) || (isMultiple ? [] : '');

	// Update form value if it was an object (normalize it to ID)
	useEffect(() => {
		if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
			const normalized = normalizeValue(rawValue);
			if (normalized !== rawValue) {
				setValue(props.name, normalized, { shouldValidate: false });
			}
		} else if (rawValue && Array.isArray(rawValue) && rawValue.some((v: any) => typeof v === 'object')) {
			const normalized = normalizeValue(rawValue);
			setValue(props.name, normalized, { shouldValidate: false });
		}
	}, [rawValue, props.name, setValue]);

	const [isOpen, setIsOpen] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [inputValue, setInputValue] = useState('');
	const [relationshipOptions, setRelationshipOptions] = useState<Record<string, string>>({});
	const [relationshipRecords, setRelationshipRecords] = useState<Record<string, any>>({});
	// Track which records were individually fetched (for edit mode) - these should be formatted
	const [individuallyFetchedIds, setIndividuallyFetchedIds] = useState<Set<string>>(new Set());
	// Cache formatted labels for individually fetched records to prevent re-rendering
	const [formattedLabels, setFormattedLabels] = useState<Record<string, string>>({});
	const [isLoadingRelationship, setIsLoadingRelationship] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	// Format option label using custom formatter if provided
	const formatOptionLabel = (value: string, label: string, record?: any): string => {
		if (props.optionLabelFormatter && record) {
			const result = executeSerializedFunction(props.optionLabelFormatter, value, record);
			return result !== null && result !== undefined ? String(result) : label;
		}
		return label;
	};

	// Fetch relationship data when component mounts or search term changes
	useEffect(() => {
		if (!hasRelationship || !props.relationship) return;

		const fetchRelationshipData = async () => {
			setIsLoadingRelationship(true);
			try {
				const { resource, titleAttribute } = props.relationship!;
				const resourceSlug = resource || props.relationship!.name;

				if (!resourceSlug) {
					throw new Error('Resource slug is required for relationship data fetching');
				}

				const apiBaseUrl = (props as any).apiBaseUrl || '/kratosjs/api';
				const url = `${apiBaseUrl}/${resourceSlug}/list`;

				const body: any = { perPage: 50 };
				if (searchTerm) {
					body.search = searchTerm;
				}

				const response = await authenticatedFetch(
					url,
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(body),
					},
					apiBaseUrl,
				);

				if (!response.ok) {
					throw new Error(`Failed to fetch relationship data: ${response.status}`);
				}

				const result = await response.json();
				const data = result.data || [];

				const options: Record<string, string> = {};
				const records: Record<string, any> = {};
				data.forEach((item: any) => {
					const id = item._id || item.id;
					const title = item[titleAttribute] || id;
					options[id] = title;
					records[id] = item;
				});

				// Replace with API results so the list reflects current search; preserve labels for selected value(s) so chips still display
				const valueIds = isMultiple
					? Array.isArray(currentValue)
						? currentValue
						: []
					: currentValue
						? [currentValue]
						: [];
				setRelationshipOptions(prev => {
					const next = { ...options };
					valueIds.forEach((id: string) => {
						if (prev[id]) next[id] = prev[id];
					});
					return next;
				});

				// Replace records with API results; preserve individually fetched ones so formatted labels are kept
				setRelationshipRecords(prev => {
					const next = { ...records };
					valueIds.forEach((id: string) => {
						if (individuallyFetchedIds.has(id) && prev[id]) next[id] = prev[id];
					});
					return next;
				});
			} catch (error) {
				console.error('Error fetching relationship data:', error);
				setRelationshipOptions({});
			} finally {
				setIsLoadingRelationship(false);
			}
		};

		const timeoutId = setTimeout(fetchRelationshipData, searchTerm ? 300 : 0);
		return () => clearTimeout(timeoutId);
	}, [hasRelationship, searchTerm, props.relationship, individuallyFetchedIds, currentValue, isMultiple]);

	// Fetch related record(s) when editing (if we have a current value but no record data)
	useEffect(() => {
		if (!hasRelationship || !props.relationship || !currentValue) return;

		const valueIds = isMultiple ? (Array.isArray(currentValue) ? currentValue : []) : [currentValue as string];

		const missingIds = valueIds.filter((id: string) => !relationshipRecords[id]);

		if (missingIds.length > 0) {
			const fetchRelatedRecords = async () => {
				try {
					const { resource, titleAttribute } = props.relationship!;
					const resourceSlug = resource || props.relationship!.name;
					const apiBaseUrl = (props as any).apiBaseUrl || '/kratosjs/api';

					const fetchPromises = missingIds.map(async (id: string) => {
						try {
							const response = await authenticatedFetch(
								`${apiBaseUrl}/${resourceSlug}/${id}`,
								{
									headers: {},
								},
								apiBaseUrl,
							);
							if (response.ok) {
								const result = await response.json();
								// Handle new response structure: { data, metadata }
								const record = result.data || result;
								return { id, record };
							}
						} catch (error) {
							console.error(`Error fetching record ${id}:`, error);
						}
						return null;
					});

					const results = await Promise.all(fetchPromises);

					const newOptions = { ...relationshipOptions };
					const newRecords = { ...relationshipRecords };
					const newFormattedLabels: Record<string, string> = {};

					results.forEach(result => {
						if (result) {
							const { id, record } = result;
							const title = record[titleAttribute] || id;
							newOptions[id] = title;
							newRecords[id] = record;
							// Pre-format and cache the label for this individually fetched record
							const formatted = formatOptionLabel(id, title, record);
							newFormattedLabels[id] = formatted;
						}
					});

					setRelationshipOptions(newOptions);
					setRelationshipRecords(newRecords);
					// Mark these records as individually fetched and cache their formatted labels
					setIndividuallyFetchedIds(prev => {
						const newSet = new Set(prev);
						results.forEach(result => {
							if (result) newSet.add(result.id);
						});
						return newSet;
					});
					setFormattedLabels(prev => ({ ...prev, ...newFormattedLabels }));
				} catch (error) {
					console.error('Error fetching related records:', error);
				}
			};

			fetchRelatedRecords();
		}
	}, [hasRelationship, currentValue, relationshipRecords, props.relationship, isMultiple]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
				setSearchTerm('');
				setInputValue('');
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	// Use relationship options if available, otherwise use static options
	const effectiveOptions = hasRelationship ? relationshipOptions : props.options || {};

	// If native or not multiple and not creatable and not relationship, use native select
	if (isNative || (!isMultiple && !isCreatable && !hasRelationship)) {
		return (
			<div className="mb-4">
				{props.label && (
					<label
						htmlFor={props.name}
						className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						{props.label}
						{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
					</label>
				)}

				<select
					id={props.name}
					{...register(props.name, validation)}
					disabled={props.disabled}
					multiple={isMultiple}
					className={cn(
						'w-full px-3 py-2 border rounded-lg shadow-sm',
						'k-input',
						'focus:outline-none focus:ring-2 focus:ring-ring',
						'transition duration-150 ease-in-out',
						hasError && 'border-red-500 dark:border-red-400 focus:ring-red-500 dark:focus:ring-red-400',
						props.disabled && 'opacity-60 cursor-not-allowed',
						isMultiple && 'min-h-[120px]',
					)}>
					{props.placeholder && !isMultiple && props.selectablePlaceholder !== false && (
						<option value="">{props.placeholder}</option>
					)}

					{effectiveOptions &&
						Object.entries(effectiveOptions).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
				</select>

				{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

				{props.helperText && (
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>
				)}

				{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}

				{isMultiple && !hasError && (
					<p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Hold Ctrl/Cmd to select multiple options
					</p>
				)}
			</div>
		);
	}

	// Enhanced multi-select with chips
	const selectedValues: string[] = isMultiple
		? Array.isArray(currentValue)
			? currentValue.filter((v): v is string => typeof v === 'string')
			: []
		: currentValue && typeof currentValue === 'string'
			? [currentValue]
			: [];

	const optionEntries = Object.entries(effectiveOptions);

	// Filter options based on search term
	// For relationship-based selects, the API already filters the results, so skip client-side filtering
	const filteredOptions = hasRelationship
		? optionEntries
		: optionEntries.filter(([value, label]) => {
				const matchesSearch = !searchTerm || label.toLowerCase().includes(searchTerm.toLowerCase());
				return matchesSearch;
			});

	// Check if we can create a new option
	const canCreateNew =
		isCreatable &&
		searchTerm &&
		!optionEntries.some(([value, label]) => label.toLowerCase() === searchTerm.toLowerCase()) &&
		!selectedValues.includes(searchTerm);

	// Check if we can create a new relationship record
	const canCreateRelationship = hasRelationship && props.createOptionForm;

	const toggleOption = (value: string) => {
		// When selecting a new option, format and cache its label if we have the record
		const record = relationshipRecords[value];
		if (record && !formattedLabels[value]) {
			const label = relationshipOptions[value] || value;
			const formatted = formatOptionLabel(value, label, record);
			setFormattedLabels(prev => ({ ...prev, [value]: formatted }));
			// Mark as individually fetched so it stays formatted
			setIndividuallyFetchedIds(prev => new Set(prev).add(value));
		}

		if (isMultiple) {
			const newValues = selectedValues.includes(value)
				? selectedValues.filter((v: string) => v !== value)
				: [...selectedValues, value];
			setValue(props.name, newValues, { shouldValidate: true });
		} else {
			setValue(props.name, value, { shouldValidate: true });
			setIsOpen(false);
			setSearchTerm('');
		}
	};

	const removeValue = (value: string) => {
		if (isMultiple) {
			const newValues = selectedValues.filter((v: string) => v !== value);
			setValue(props.name, newValues, { shouldValidate: true });
		} else {
			setValue(props.name, '', { shouldValidate: true });
		}
	};

	const createNewOption = () => {
		if (!canCreateNew || !searchTerm) return;

		const trimmedValue = searchTerm.trim();
		if (isMultiple) {
			const newValues = [...selectedValues, trimmedValue];
			setValue(props.name, newValues, { shouldValidate: true });
		} else {
			setValue(props.name, trimmedValue, { shouldValidate: true });
			setIsOpen(false);
		}
		setSearchTerm('');
		setInputValue('');
	};

	const handleCreateRelationshipSuccess = (newRecord: any) => {
		const id = newRecord._id || newRecord.id;
		const title = newRecord[props.relationship!.titleAttribute] || id;

		setRelationshipOptions(prev => ({ ...prev, [id]: title }));
		setRelationshipRecords(prev => ({ ...prev, [id]: newRecord }));

		// Format and cache the label for the newly created record
		const formatted = formatOptionLabel(id, title, newRecord);
		setFormattedLabels(prev => ({ ...prev, [id]: formatted }));
		setIndividuallyFetchedIds(prev => new Set(prev).add(id));

		if (isMultiple) {
			const newValues = [...selectedValues, id];
			setValue(props.name, newValues, { shouldValidate: true });
		} else {
			setValue(props.name, id, { shouldValidate: true });
		}

		setShowCreateModal(false);
		setIsOpen(false);
		setSearchTerm('');
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (canCreateNew) {
				createNewOption();
			} else if (filteredOptions.length === 1) {
				toggleOption(filteredOptions[0][0]);
				setSearchTerm('');
			}
		} else if (e.key === 'Backspace' && !searchTerm && selectedValues.length > 0 && isMultiple) {
			removeValue(selectedValues[selectedValues.length - 1]);
		}
	};

	const getDisplayLabel = (value: string) => {
		// If we have a cached formatted label for this individually fetched record, use it
		if (formattedLabels[value]) {
			return formattedLabels[value];
		}
		// Otherwise, return the plain label
		return effectiveOptions[value] || value;
	};

	return (
		<div className="mb-4">
			{props.label && (
				<label htmlFor={props.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
					{props.label}
					{validation.required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
				</label>
			)}

			{/* Hidden input for form registration */}
			<input type="hidden" {...register(props.name, validation)} />

			<div ref={dropdownRef} className="relative">
				{/* Selected values display / Input */}
				<div
					onClick={() => !props.disabled && setIsOpen(!isOpen)}
					className={cn(
						'w-full min-h-[42px] px-3 py-2 border rounded-lg shadow-sm cursor-pointer',
						'k-input',
						'focus-within:outline-none focus-within:ring-2 focus-within:ring-ring ',
						'transition duration-150 ease-in-out',
						hasError &&
							'border-red-500 dark:border-red-400 focus-within:ring-red-500 dark:focus-within:ring-red-400',
						props.disabled && 'opacity-60 cursor-not-allowed bg-muted',
					)}>
					<div className="flex flex-wrap gap-2 items-center">
						{/* Display selected values as chips */}
						{selectedValues.map((value: string) => {
							const displayLabel = getDisplayLabel(value);
							const hasHTML = /<[^>]+>/.test(displayLabel);

							return (
								<span
									key={value}
									className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium bg-accent-soft dark:bg-accent-soft text-accent">
									{hasHTML ? (
										<span dangerouslySetInnerHTML={{ __html: displayLabel }} />
									) : (
										<span>{displayLabel}</span>
									)}
									{!props.disabled && (
										<button
											type="button"
											onClick={e => {
												e.stopPropagation();
												removeValue(value);
											}}
											className="hover:text-accent-hover transition-colors">
											<Icon name="X" size={14} />
										</button>
									)}
								</span>
							);
						})}

						{/* Search/Input field */}
						{!props.disabled && (
							<input
								type="text"
								value={searchTerm}
								onChange={e => {
									setSearchTerm(e.target.value);
									if (!isOpen) setIsOpen(true);
								}}
								onKeyDown={handleKeyDown}
								onClick={e => {
									e.stopPropagation();
									setIsOpen(true);
								}}
								onFocus={() => setIsOpen(true)}
								placeholder={selectedValues.length === 0 ? props.placeholder || 'Select...' : ''}
								className="flex-1 min-w-[120px] outline-none bg-transparent text-fg"
								disabled={props.disabled}
							/>
						)}

						{/* Dropdown arrow */}
						<Icon
							name={isOpen ? 'ChevronUp' : 'ChevronDown'}
							size={16}
							className="text-gray-400 shrink-0"
						/>
					</div>
				</div>

				{/* Dropdown menu */}
				{isOpen && !props.disabled && (
					<div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
						{isLoadingRelationship && (
							<div className="px-3 py-2 text-sm text-fg-secondary flex items-center gap-2">
								<Icon name="Loader2" size={16} className="animate-spin" />
								<span>Loading...</span>
							</div>
						)}

						{!isLoadingRelationship &&
							filteredOptions.length === 0 &&
							!canCreateNew &&
							!canCreateRelationship && (
								<div className="px-3 py-2 text-sm text-fg-secondary">
									{searchTerm ? 'No matching options found' : 'No options available'}
								</div>
							)}

						{!isLoadingRelationship &&
							filteredOptions.map(([value, label]) => {
								const record = relationshipRecords[value];
								const displayLabel = formatOptionLabel(value, label, record);
								const hasHTML = /<[^>]+>/.test(displayLabel);

								return (
									<div
										key={value}
										onClick={() => {
											toggleOption(value);
											setSearchTerm('');
										}}
										className={cn(
											'px-3 py-2 cursor-pointer text-sm transition-colors text-fg',
											'hover:bg-gray-100 dark:hover:bg-gray-700',
											selectedValues.includes(value) && 'bg-accent-soft text-accent',
										)}>
										<div className="flex items-center justify-between">
											{hasHTML ? (
												<span dangerouslySetInnerHTML={{ __html: displayLabel }} />
											) : (
												<span>{displayLabel}</span>
											)}
											{selectedValues.includes(value) && <Icon name="Check" size={16} />}
										</div>
									</div>
								);
							})}

						{/* Create new simple option */}
						{canCreateNew && !canCreateRelationship && (
							<div
								onClick={createNewOption}
								className={cn(
									'px-3 py-2 cursor-pointer text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-accent font-medium',
									filteredOptions.length > 0 && 'border-t border-border',
								)}>
								<div className="flex items-center gap-2">
									<Icon name="Plus" size={16} />
									<span>Create "{searchTerm}"</span>
								</div>
							</div>
						)}

						{/* Create new relationship record */}
						{canCreateRelationship && (
							<div
								onClick={() => {
									setShowCreateModal(true);
									setIsOpen(false);
								}}
								className={cn(
									'px-3 py-2 cursor-pointer text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-accent font-medium',
									filteredOptions.length > 0 && 'border-t border-border',
								)}>
								<div className="flex items-center gap-2">
									<Icon name="Plus" size={16} />
									<span>{props.createOptionModalHeading || 'Create New'}</span>
								</div>
							</div>
						)}
					</div>
				)}
			</div>

			{hasError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error?.message as string}</p>}

			{props.helperText && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{props.helperText}</p>}

			{!hasError && <HintDisplay hint={props.hint} hintIcon={props.hintIcon} hintColor={props.hintColor} />}

			{/* Create relationship modal */}
			{canCreateRelationship && showCreateModal && (
				<ResourceFormModal
					isOpen={showCreateModal}
					onClose={() => setShowCreateModal(false)}
					mode="create"
					resourceName={props.createOptionModalHeading || 'Record'}
					resourceSlug={props.relationship!.resource || props.relationship!.name}
					apiBaseUrl={(props as any).apiBaseUrl || '/kratosjs/api'}
					formSchema={{ type: 'form', components: props.createOptionForm || [] } as any}
					onSuccess={handleCreateRelationshipSuccess}
					depth={1}
				/>
			)}
		</div>
	);
}
