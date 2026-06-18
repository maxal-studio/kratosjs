import React, { useState } from 'react';
import { SerializedFilter } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { PillButton } from '../ui/PillButton';

interface CustomFilterProps {
	filter: SerializedFilter;
	value?: string[];
	onChange: (value: string[] | undefined) => void;
	embedded?: boolean;
}

export function CustomFilterComponent({ filter, value, onChange, embedded = false }: CustomFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [localSelectedValues, setLocalSelectedValues] = useState<string[]>([]);
	const appliedValues = Array.isArray(value) ? value : value ? [value] : [];

	const options = filter.componentProps?.options || [];

	const toggleOption = (option: string) => {
		const newValues = localSelectedValues.includes(option)
			? localSelectedValues.filter(v => v !== option)
			: [...localSelectedValues, option];

		setLocalSelectedValues(newValues);
	};

	const clearAll = () => {
		setLocalSelectedValues([]);
		onChange(undefined);
		setIsOpen(false);
	};

	const applyChanges = () => {
		onChange(localSelectedValues.length > 0 ? localSelectedValues : undefined);
		setIsOpen(false);
	};

	const handleOpen = () => {
		setLocalSelectedValues(appliedValues);
		setIsOpen(embedded ? !isOpen : true);
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
					appliedValues.length > 0 && 'ring-2 ring-ring border-accent',
				)}>
				<div className="flex items-center justify-between">
					<span className="truncate">
						{appliedValues.length > 0 ? appliedValues.map(v => v).join(', ') : 'Select...'}
					</span>
					<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
						{appliedValues.length > 0 && (
							<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-accent rounded-full">
								{appliedValues.length}
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
							'flex max-h-[400px] flex-col overflow-hidden border border-border bg-surface',
							embedded
								? 'mt-2 rounded-xl'
								: 'absolute left-0 right-0 top-full z-[70] mt-2 rounded-lg shadow-xl',
						)}>
						<div className="p-2 overflow-y-auto flex-1">
							{options.map((option: string) => (
								<label
									key={option}
									className={cn(
										'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors',
										'hover:bg-hover',
										localSelectedValues.includes(option) && 'bg-muted',
									)}>
									<input
										type="checkbox"
										checked={localSelectedValues.includes(option)}
										onChange={() => toggleOption(option)}
										className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-accent focus:ring-ring"
									/>
									<span className="text-sm text-fg capitalize">{option}</span>
								</label>
							))}
							{options.length === 0 && (
								<div className="px-3 py-4 text-center text-sm text-fg-secondary">
									No options available
								</div>
							)}
						</div>

						<div className="flex items-center justify-between p-2 border-t border-border flex-shrink-0">
							<button
								onClick={clearAll}
								type="button"
								className="text-xs font-medium text-fg-secondary hover:text-fg"
								disabled={localSelectedValues.length === 0}>
								Clear
							</button>
							<PillButton type="button" variant="primary" onClick={applyChanges}>
								Apply
							</PillButton>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
