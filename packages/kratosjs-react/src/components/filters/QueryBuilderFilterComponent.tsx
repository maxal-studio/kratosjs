import React, { useState, useEffect } from 'react';
import { SerializedFilter } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { PillButton } from '../ui/PillButton';

interface QueryBuilderFilterProps {
	filter: SerializedFilter;
	value?: any[];
	onChange: (value: any[] | undefined) => void;
	/** Expand inline instead of a nested popover (for filters dropdown panel). */
	embedded?: boolean;
}

export function QueryBuilderFilterComponent({ filter, value, onChange, embedded = false }: QueryBuilderFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [localRules, setLocalRules] = useState<any[]>(value || []);
	const appliedRules = value || [];

	// Sync local rules when value prop changes (e.g., when defaults are applied)
	// Only sync when dropdown is closed to avoid interrupting user edits
	useEffect(() => {
		if (!isOpen) {
			setLocalRules(value || []);
		}
	}, [value, isOpen]);

	const addRule = () => {
		const firstConstraint = filter.constraints?.[0];
		const newRule = {
			type: firstConstraint?.name || '',
			dataType: firstConstraint?.dataType || 'text',
			data: {
				operator: firstConstraint?.operators?.[0]?.name || '',
				settings: {
					field: firstConstraint?.name || '',
					value: '',
				},
			},
		};
		setLocalRules([...localRules, newRule]);
	};

	const updateRule = (index: number, updates: any) => {
		const newRules = localRules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
		setLocalRules(newRules);
	};

	const removeRule = (index: number) => {
		setLocalRules(localRules.filter((_, i) => i !== index));
	};

	const clearAll = () => {
		setLocalRules([]);
		onChange(undefined);
		setIsOpen(false);
	};

	const applyChanges = () => {
		onChange(localRules.length > 0 ? localRules : undefined);
		setIsOpen(false);
	};

	const handleOpen = () => {
		setLocalRules(appliedRules);
		setIsOpen(embedded ? !isOpen : true);
	};

	const getConstraint = (name: string) => {
		return filter.constraints?.find(c => c.name === name);
	};

	return (
		<div className="relative">
			<button
				onClick={handleOpen}
				type="button"
				className={cn(
					'w-full h-10 px-3 pr-10 text-sm text-left rounded-lg border transition-colors',
					'bg-input text-fg border-border',
					'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
					appliedRules.length > 0 && 'ring-2 ring-ring border-accent',
				)}>
				<div className="flex items-center justify-between">
					<span>{appliedRules.length > 0 ? `${appliedRules.length} rule(s) active` : 'Add rules...'}</span>
					<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
						{appliedRules.length > 0 && (
							<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-accent rounded-full">
								{appliedRules.length}
							</span>
						)}
						<svg
							className="w-4 h-4 text-fg-secondary"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
						</svg>
					</div>
				</div>
			</button>

			{isOpen && (
				<>
					{!embedded && <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />}

					<div
						className={cn(
							'flex flex-col overflow-hidden border border-border bg-surface',
							embedded
								? 'mt-2 rounded-xl'
								: 'absolute left-0 right-0 top-full z-[70] mt-2 max-h-[500px] rounded-lg shadow-xl',
						)}>
						<div className="flex items-center justify-between p-4 border-b border-border shrink-0">
							<h3 className="text-base font-semibold text-fg">Query Builder</h3>
							<button
								onClick={() => setIsOpen(false)}
								type="button"
								className="p-1 rounded-md text-fg-secondary hover:text-fg hover:bg-hover">
								<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						<div className="p-4 space-y-3 overflow-y-auto flex-1">
							{localRules.map((rule, index) => {
								const constraint = getConstraint(rule.type);
								const operators = constraint?.operators || [];

								return (
									<div key={index} className="p-3 rounded-lg border border-border bg-muted space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-xs font-medium text-fg-secondary uppercase tracking-wide">
												Rule {index + 1}
											</span>
											<button
												onClick={() => removeRule(index)}
												type="button"
												className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
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

										{/* Responsive grid - stack on mobile */}
										{(() => {
											const isBetweenOperator =
												rule.data?.operator === 'between' ||
												rule.data?.operator === 'notBetween';
											const isDateType = rule.dataType === 'date';
											const isNumberType = rule.dataType === 'number';

											return (
												<div className="space-y-2">
													{/* Field and Operator in a grid */}
													<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
														{/* Field selector */}
														<div className="relative">
															<select
																value={rule.type}
																onChange={e => {
																	const newConstraint = getConstraint(e.target.value);
																	updateRule(index, {
																		type: e.target.value,
																		dataType: newConstraint?.dataType || 'text',
																		data: {
																			...rule.data,
																			operator:
																				newConstraint?.operators?.[0]?.name ||
																				'',
																			settings: {
																				...rule.data.settings,
																				field: e.target.value,
																			},
																		},
																	});
																}}
																className="w-full h-9 px-2 pr-8 text-sm rounded-md border appearance-none bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring">
																{filter.constraints?.map(c => (
																	<option key={c.name} value={c.name}>
																		{c.label || c.name}
																	</option>
																))}
															</select>
															<svg
																className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-secondary pointer-events-none"
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
														</div>

														{/* Operator selector */}
														<div className="relative">
															<select
																value={rule.data?.operator || ''}
																onChange={e =>
																	updateRule(index, {
																		data: {
																			...rule.data,
																			operator: e.target.value,
																		},
																	})
																}
																className="w-full h-9 px-2 pr-8 text-sm rounded-md border appearance-none bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring">
																{operators.map((op: any) => (
																	<option key={op.name} value={op.name}>
																		{op.label || op.name}
																	</option>
																))}
															</select>
															<svg
																className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-secondary pointer-events-none"
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
														</div>
													</div>

													{/* Value input - based on dataType and operator */}
													{isBetweenOperator && isDateType ? (
														// For "between" operator with date type, show two date inputs
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
															{(() => {
																const fromValue = Array.isArray(
																	rule.data?.settings?.value,
																)
																	? rule.data.settings.value[0]
																	: typeof rule.data?.settings?.value === 'object' &&
																		  rule.data?.settings?.value?.from
																		? rule.data.settings.value.from
																		: '';
																const toValue = Array.isArray(
																	rule.data?.settings?.value,
																)
																	? rule.data.settings.value[1]
																	: typeof rule.data?.settings?.value === 'object' &&
																		  rule.data?.settings?.value?.to
																		? rule.data.settings.value.to
																		: '';

																return (
																	<>
																		<input
																			type="date"
																			value={fromValue}
																			onChange={e => {
																				const newValue = {
																					from: e.target.value,
																					to: toValue,
																				};
																				updateRule(index, {
																					data: {
																						...rule.data,
																						settings: {
																							...rule.data.settings,
																							value: newValue,
																						},
																					},
																				});
																			}}
																			placeholder="From date..."
																			className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
																		/>
																		<input
																			type="date"
																			value={toValue}
																			onChange={e => {
																				const newValue = {
																					from: fromValue,
																					to: e.target.value,
																				};
																				updateRule(index, {
																					data: {
																						...rule.data,
																						settings: {
																							...rule.data.settings,
																							value: newValue,
																						},
																					},
																				});
																			}}
																			placeholder="To date..."
																			className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
																		/>
																	</>
																);
															})()}
														</div>
													) : isBetweenOperator && isNumberType ? (
														// For "between" operator with number type, show two number inputs
														<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
															{(() => {
																const fromValue = Array.isArray(
																	rule.data?.settings?.value,
																)
																	? rule.data.settings.value[0]
																	: '';
																const toValue = Array.isArray(
																	rule.data?.settings?.value,
																)
																	? rule.data.settings.value[1]
																	: '';

																return (
																	<>
																		<input
																			type="number"
																			value={fromValue}
																			onChange={e => {
																				const newValue = [
																					e.target.value || '',
																					toValue,
																				];
																				updateRule(index, {
																					data: {
																						...rule.data,
																						settings: {
																							...rule.data.settings,
																							value: newValue,
																						},
																					},
																				});
																			}}
																			placeholder="From..."
																			className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
																		/>
																		<input
																			type="number"
																			value={toValue}
																			onChange={e => {
																				const newValue = [
																					fromValue,
																					e.target.value || '',
																				];
																				updateRule(index, {
																					data: {
																						...rule.data,
																						settings: {
																							...rule.data.settings,
																							value: newValue,
																						},
																					},
																				});
																			}}
																			placeholder="To..."
																			className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
																		/>
																	</>
																);
															})()}
														</div>
													) : isDateType ? (
														// Single date input for date type
														<input
															type="date"
															value={rule.data?.settings?.value || ''}
															onChange={e =>
																updateRule(index, {
																	data: {
																		...rule.data,
																		settings: {
																			...rule.data.settings,
																			value: e.target.value,
																		},
																	},
																})
															}
															placeholder="Date..."
															className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
														/>
													) : rule.dataType === 'number' ? (
														// Number input for number type
														<input
															type="number"
															value={rule.data?.settings?.value || ''}
															onChange={e =>
																updateRule(index, {
																	data: {
																		...rule.data,
																		settings: {
																			...rule.data.settings,
																			value: e.target.value,
																		},
																	},
																})
															}
															placeholder="Value..."
															className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
														/>
													) : (
														// Regular text input for text, select, and other types
														<input
															type="text"
															value={rule.data?.settings?.value || ''}
															onChange={e =>
																updateRule(index, {
																	data: {
																		...rule.data,
																		settings: {
																			...rule.data.settings,
																			value: e.target.value,
																		},
																	},
																})
															}
															placeholder="Value..."
															className="w-full h-9 px-2 text-sm rounded-md border bg-input text-fg border-border focus:outline-none focus:ring-2 focus:ring-ring"
														/>
													)}
												</div>
											);
										})()}
									</div>
								);
							})}

							{localRules.length === 0 && (
								<div className="text-center py-8 text-fg-secondary">
									<svg
										className="w-12 h-12 mx-auto mb-3 opacity-50"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24">
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={1.5}
											d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
										/>
									</svg>
									<p className="text-sm mb-1">No rules added yet</p>
									<p className="text-xs">Click "Add Rule" to start building your query</p>
								</div>
							)}

							<PillButton
								type="button"
								onClick={addRule}
								className="w-full border-dashed border-accent/40 bg-transparent text-accent hover:bg-accent-soft">
								+ Add Rule
							</PillButton>
						</div>

						<div className="flex items-center justify-between p-4 border-t border-border shrink-0">
							<button
								onClick={clearAll}
								type="button"
								className="text-sm font-medium text-fg-secondary hover:text-fg"
								disabled={localRules.length === 0}>
								Clear all
							</button>
							<div className="flex gap-2">
								<PillButton type="button" onClick={() => setIsOpen(false)}>
									Cancel
								</PillButton>
								<PillButton type="button" variant="primary" onClick={applyChanges}>
									Apply
								</PillButton>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
