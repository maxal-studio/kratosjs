import React from 'react';
import { SerializedColumn } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { Checkbox } from '../Checkbox';
import { translate } from '../../i18n/activeLocale';

interface ColumnTogglePopupProps {
	columns: SerializedColumn[];
	visibleColumnNames: Set<string>;
	onToggle: (columnName: string, visible: boolean) => void;
	isOpen: boolean;
	onClose: () => void;
}

export function ColumnTogglePopup({ columns, visibleColumnNames, onToggle, isOpen, onClose }: ColumnTogglePopupProps) {
	if (!isOpen) {
		return null;
	}

	// Filter to only toggleable columns (exclude columns with hidden: true)
	const toggleableColumns = columns.filter(col => col.hidden !== true && col.toggleable !== false);

	return (
		<>
			{/* Backdrop */}
			<div className="fixed inset-0 z-40" onClick={onClose} />

			{/* Dropdown panel - fixed position on mobile, absolute on desktop */}
			<div className="fixed inset-x-4 top-1/2 z-50 flex max-h-[80vh] w-auto -translate-y-1/2 flex-col overflow-visible rounded-xl border border-border bg-raised p-4 shadow-soft-lg sm:absolute sm:inset-auto sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[400px] sm:translate-y-0">
				<div className="mb-4 flex shrink-0 items-center justify-between">
					<h3 className="text-sm font-medium text-fg">{translate('core:table.column_visibility')}</h3>
					<button
						onClick={onClose}
						className="rounded-full p-1.5 text-fg-secondary transition-colors hover:bg-hover/70 hover:text-fg">
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

				<div className="space-y-2 flex-1 overflow-y-auto pr-2">
					{toggleableColumns.length === 0 ? (
						<p className="text-sm text-fg-secondary text-center py-4">
							{translate('core:table.no_toggleable_columns')}
						</p>
					) : (
						toggleableColumns.map(column => {
							const isVisible = visibleColumnNames.has(column.name);
							const isDisabled = column.hidden === true;

							return (
								<label
									key={column.name}
									className={cn(
										'flex cursor-pointer items-center gap-3 rounded-full px-3 py-2 transition-colors hover:bg-hover/70',
										isDisabled && 'cursor-not-allowed opacity-50',
									)}>
									<Checkbox
										checked={isVisible}
										onChange={checked => onToggle(column.name, checked)}
										disabled={isDisabled}
									/>
									<span className="text-sm text-fg flex-1">{column.label || column.name}</span>
								</label>
							);
						})
					)}
				</div>

				<div className="mt-4 flex shrink-0 justify-end border-t border-border/60 pt-4">
					<button
						onClick={onClose}
						className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover">
						{translate('core:common.done')}
					</button>
				</div>
			</div>
		</>
	);
}
