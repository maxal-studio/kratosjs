import React, { useState } from 'react';
import { SerializedFilter } from '@maxal_studio/kratosjs';
import { Filter, ChevronDown, X } from 'lucide-react';
import { cn } from '../../utils/classNames';
import { Select } from '../../components/ui/Select';
import { Label } from '../../components/ui/Label';
import { PillButton, PillIconButton } from '../../components/ui/PillButton';
import { QueryBuilderFilterComponent } from '../../components/filters/QueryBuilderFilterComponent';
import { CustomFilterComponent } from '../../components/filters/CustomFilterComponent';
import { DateFilterComponent } from '../../components/filters/DateFilterComponent';
import { TableToolbarButton } from './TableToolbarButton';

interface FilterFieldProps {
	filter: SerializedFilter;
	value: any;
	onChange: (value: any, isQueryBuilder?: boolean) => void;
	embedded?: boolean;
}

function FilterField({ filter, value, onChange, embedded }: FilterFieldProps) {
	const hasValue = value !== undefined && value !== '' && value !== null;

	if (filter.type === 'select') {
		return (
			<div className="space-y-1.5">
				<Label>{filter.label || filter.name}</Label>
				<Select value={value || ''} onChange={e => onChange(e.target.value || undefined)} active={hasValue}>
					<option value="">{filter.placeholder || `All ${filter.label || filter.name}`}</option>
					{filter.options &&
						Object.entries(filter.options).map(([val, label]) => (
							<option key={val} value={val}>
								{label as string}
							</option>
						))}
				</Select>
			</div>
		);
	}

	if (filter.type === 'ternary') {
		return (
			<div className="space-y-1.5">
				<Label>{filter.label || filter.name}</Label>
				<Select
					value={value !== undefined ? String(value) : ''}
					onChange={e => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}
					active={hasValue}>
					<option value="">{filter.placeholder || 'All'}</option>
					<option value="true">{filter.trueLabel || 'Yes'}</option>
					<option value="false">{filter.falseLabel || 'No'}</option>
				</Select>
			</div>
		);
	}

	if (filter.type === 'date') {
		return <DateFilterComponent filter={filter} value={value} onChange={onChange} embedded={embedded} />;
	}

	if (filter.type === 'queryBuilder') {
		return (
			<div className="space-y-1.5">
				<Label>{filter.label || 'Advanced Search'}</Label>
				<QueryBuilderFilterComponent
					filter={filter}
					value={value}
					onChange={value => onChange(value, true)}
					embedded={embedded}
				/>
			</div>
		);
	}

	if (filter.type === 'custom') {
		return (
			<div className="space-y-1.5">
				<Label>{filter.label || filter.name}</Label>
				<CustomFilterComponent filter={filter} value={value} onChange={onChange} embedded={embedded} />
			</div>
		);
	}

	return null;
}

export interface FiltersPanelProps {
	filters: SerializedFilter[];
	values: Record<string, any>;
	queryBuilderValues: Record<string, any[]>;
	onChange: (name: string, value: any, isQueryBuilder?: boolean) => void;
	onClear: () => void;
	layout: 'inline' | 'dropdown' | 'sidebar';
}

export function FiltersPanel({ filters, values, queryBuilderValues, onChange, onClear, layout }: FiltersPanelProps) {
	const [isOpen, setIsOpen] = useState(false);

	const regularCount = Object.keys(values).filter(key => values[key] !== undefined).length;
	const queryBuilderCount = Object.keys(queryBuilderValues).filter(
		key => queryBuilderValues[key] && queryBuilderValues[key].length > 0,
	).length;
	const activeCount = regularCount + queryBuilderCount;

	const fields = filters.map(filter => {
		const isQueryBuilder = filter.type === 'queryBuilder';
		const value = isQueryBuilder ? queryBuilderValues[filter.name] : values[filter.name];
		return (
			<FilterField
				key={filter.name}
				filter={filter}
				value={value}
				onChange={(value, isQB) => onChange(filter.name, value, isQB)}
				embedded={layout === 'dropdown'}
			/>
		);
	});

	// Inline layout — all filters visible in a card
	if (layout === 'inline') {
		return (
			<div className="rounded-xl border border-border bg-surface p-4">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{fields}</div>
				{activeCount > 0 && (
					<div className="mt-4 flex justify-end border-t border-border/60 pt-4">
						<button
							type="button"
							onClick={onClear}
							className="text-sm font-medium text-accent transition-colors hover:text-accent-hover">
							Clear all filters
						</button>
					</div>
				)}
			</div>
		);
	}

	// Dropdown layout — filters behind a trigger button
	return (
		<div className="relative">
			<TableToolbarButton
				onClick={() => setIsOpen(!isOpen)}
				icon={<Filter className="h-4 w-4" />}
				className={cn(activeCount > 0 && 'ring-2 ring-ring border-accent')}
				aria-expanded={isOpen}>
				<span>Filters</span>
				{activeCount > 0 && (
					<span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-accent-fg">
						{activeCount}
					</span>
				)}
				<ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
			</TableToolbarButton>

			{isOpen && (
				<>
					{/* Backdrop */}
					<div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

					{/* Dropdown panel — fixed on mobile, anchored on desktop */}
					<div className="fixed inset-x-4 top-1/2 z-50 flex max-h-[80vh] w-auto -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-border bg-raised p-4 shadow-soft-lg sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:left-auto sm:mt-2 sm:w-[min(480px,calc(100vw-2rem))] sm:translate-y-0">
						<div className="mb-4 flex shrink-0 items-center justify-between">
							<h3 className="text-base font-semibold text-fg">Filters</h3>
							<PillIconButton aria-label="Close filters" onClick={() => setIsOpen(false)}>
								<X className="h-4 w-4" />
							</PillIconButton>
						</div>

						<div className="flex-1 space-y-4 overflow-y-auto pr-2">{fields}</div>

						<div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4">
							<button
								type="button"
								onClick={() => {
									onClear();
									setIsOpen(false);
								}}
								disabled={activeCount === 0}
								className="text-sm font-medium text-fg-secondary transition-colors hover:text-fg disabled:opacity-50">
								Clear all
							</button>
							<PillButton variant="primary" onClick={() => setIsOpen(false)}>
								Done
							</PillButton>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
