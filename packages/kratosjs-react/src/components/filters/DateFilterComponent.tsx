import React, { useState } from 'react';
import { SerializedFilter } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { PillButton } from '../ui/PillButton';

/** Date filter value sent to API: always from/to (YYYY-MM-DD) */
export type DateFilterValue = undefined | { from?: string; to?: string };

const PRESET_OPTIONS: {
	value: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';
	label: string;
}[] = [
	{ value: 'today', label: 'Today' },
	{ value: 'yesterday', label: 'Yesterday' },
	{ value: 'this_week', label: 'This Week' },
	{ value: 'this_month', label: 'This Month' },
	{ value: 'this_year', label: 'This Year' },
	{ value: 'custom', label: 'Custom' },
];

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Compute from/to (YYYY-MM-DD) for a preset using the user's local time.
 */
function getDateRangeForPreset(preset: string): { from: string; to: string } | null {
	const now = new Date();

	switch (preset) {
		case 'today': {
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			return { from: toDateStr(start), to: toDateStr(end) };
		}
		case 'yesterday': {
			const y = new Date(now);
			y.setDate(y.getDate() - 1);
			const start = new Date(y.getFullYear(), y.getMonth(), y.getDate());
			const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
			return { from: toDateStr(start), to: toDateStr(end) };
		}
		case 'this_week': {
			const day = now.getDay();
			const diff = day === 0 ? -6 : 1 - day;
			const monday = new Date(now);
			monday.setDate(monday.getDate() + diff);
			const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate());
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			return { from: toDateStr(start), to: toDateStr(end) };
		}
		case 'this_month': {
			const start = new Date(now.getFullYear(), now.getMonth(), 1);
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			return { from: toDateStr(start), to: toDateStr(end) };
		}
		case 'this_year': {
			const start = new Date(now.getFullYear(), 0, 1);
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
			return { from: toDateStr(start), to: toDateStr(end) };
		}
		default:
			return null;
	}
}

/** Infer which preset matches the current from/to (for display and reopening popup). */
function inferPresetFromValue(
	value: DateFilterValue,
): 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom' {
	if (!value || (typeof value === 'object' && !value.from && !value.to)) return 'custom';
	const from = (value as any).from;
	const to = (value as any).to;
	if (!from && !to) return 'custom';
	for (const preset of ['today', 'yesterday', 'this_week', 'this_month', 'this_year'] as const) {
		const range = getDateRangeForPreset(preset);
		if (range && range.from === from && range.to === to) return preset;
	}
	return 'custom';
}

function getPresetLabel(preset: string): string {
	return PRESET_OPTIONS.find(o => o.value === preset)?.label ?? preset;
}

interface DateFilterProps {
	filter: SerializedFilter;
	value?: DateFilterValue;
	onChange: (value: DateFilterValue) => void;
	embedded?: boolean;
}

export function DateFilterComponent({ filter, value, onChange, embedded = false }: DateFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const inferredPreset = value && (value.from || value.to) ? inferPresetFromValue(value) : 'custom';
	const customFrom = (value && (value as any).from) || '';
	const customTo = (value && (value as any).to) || '';
	const [localPreset, setLocalPreset] = useState<
		'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom'
	>(inferredPreset);
	const [localFromDate, setLocalFromDate] = useState(customFrom);
	const [localToDate, setLocalToDate] = useState(customTo);

	const hasValue = value !== undefined && !!((value as any).from || (value as any).to);

	const formatDisplay = (): string => {
		if (!value || typeof value !== 'object') return '';
		const from = (value as any).from;
		const to = (value as any).to;
		if (from && to) return `${from} – ${to}`;
		if (from) return `From ${from}`;
		if (to) return `Until ${to}`;
		return '';
	};

	const handleOpen = () => {
		setLocalPreset(inferredPreset);
		setLocalFromDate(customFrom);
		setLocalToDate(customTo);
		setIsOpen(embedded ? !isOpen : true);
	};

	const clearFilter = () => {
		setLocalPreset('custom');
		setLocalFromDate('');
		setLocalToDate('');
		onChange(undefined);
		setIsOpen(false);
	};

	const applyChanges = () => {
		if (localPreset !== 'custom') {
			const range = getDateRangeForPreset(localPreset);
			onChange(range ? { from: range.from, to: range.to } : undefined);
		} else {
			const from = localFromDate || undefined;
			const to = localToDate || undefined;
			onChange(from || to ? { from, to } : undefined);
		}
		setIsOpen(false);
	};

	return (
		<div className="space-y-1.5">
			<label className="block text-sm font-medium text-fg">{filter.label || filter.name}</label>
			<div className="relative">
				<button
					onClick={handleOpen}
					type="button"
					className={cn(
						'w-full h-10 px-3 pr-10 text-sm text-left rounded-lg border transition-colors',
						'bg-input text-fg border-border',
						'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
						hasValue && 'ring-2 ring-ring border-accent',
					)}>
					<div className="flex items-center justify-between">
						<span className="truncate">
							{hasValue
								? inferredPreset !== 'custom'
									? getPresetLabel(inferredPreset)
									: formatDisplay()
								: filter.placeholder || 'Select date range...'}
						</span>
						<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
							{hasValue && (
								<span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-accent rounded-full">
									1
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
									: 'fixed inset-x-4 top-1/2 z-[70] mx-auto max-w-sm -translate-y-1/2 sm:absolute sm:inset-x-0 sm:top-full sm:mt-2 sm:max-w-none sm:translate-y-0 rounded-lg shadow-xl',
							)}>
							<div className="p-4 space-y-3">
								{/* Preset dropdown */}
								<div>
									<label className="block text-xs font-medium text-fg-secondary mb-1.5">Range</label>
									<select
										value={localPreset}
										onChange={e => setLocalPreset(e.target.value as any)}
										className={cn(
											'w-full h-10 px-3 text-sm rounded-lg border transition-colors',
											'bg-input text-fg border-border',
											'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
										)}>
										{PRESET_OPTIONS.map(opt => (
											<option key={opt.value} value={opt.value}>
												{opt.label}
											</option>
										))}
									</select>
								</div>

								{/* Custom from/to - only when Custom is selected */}
								{localPreset === 'custom' && (
									<>
										<div className="relative">
											<label className="block text-xs font-medium text-fg-secondary mb-1.5">
												From
											</label>
											<input
												type="date"
												value={localFromDate}
												onChange={e => setLocalFromDate(e.target.value)}
												className={cn(
													'w-full h-10 px-3 text-sm rounded-lg border transition-colors',
													'bg-input text-fg border-border',
													'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
												)}
											/>
										</div>
										<div className="relative">
											<label className="block text-xs font-medium text-fg-secondary mb-1.5">
												To
											</label>
											<input
												type="date"
												value={localToDate}
												onChange={e => setLocalToDate(e.target.value)}
												className={cn(
													'w-full h-10 px-3 text-sm rounded-lg border transition-colors',
													'bg-input text-fg border-border',
													'focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent',
												)}
											/>
										</div>
									</>
								)}
							</div>

							<div className="flex items-center justify-between p-4 border-t border-border shrink-0">
								<button
									onClick={clearFilter}
									type="button"
									className="text-sm font-medium text-fg-secondary hover:text-fg">
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
		</div>
	);
}
