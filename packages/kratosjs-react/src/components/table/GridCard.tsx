import React from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { useColumnRegistry } from '../../contexts/ColumnRegistryContext';
import { cn } from '../../utils/classNames';
import { TableActionsDropdown } from './TableActionsDropdown';
import { Checkbox } from '../Checkbox';
import { PillButton } from '../ui/PillButton';
import { translate } from '../../i18n/activeLocale';

interface GridCardProps {
	schema: SerializedTable;
	row: any;
	rowIndex: number;
	totalRows: number;
	rowId: any;
	visibleColumns: any[];
	isSelected: boolean;
	hasChanges: boolean;
	openActionsRowId: any;
	onRowSelect: (rowId: any) => void;
	onCellChange: (rowId: any, columnName: string, value: any) => void;
	onRowAction: (actionName: string, rowId: any) => void;
	onSaveRow: (rowId: any) => void;
	onResetRow: (rowId: any) => void;
	onToggleActions: (rowId: any) => void;
}

export function GridCard({
	schema,
	row,
	rowIndex,
	totalRows,
	rowId,
	visibleColumns,
	isSelected,
	hasChanges,
	openActionsRowId,
	onRowSelect,
	onCellChange,
	onRowAction,
	onSaveRow,
	onResetRow,
	onToggleActions,
}: GridCardProps) {
	const columnRegistry = useColumnRegistry();

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-xl border bg-surface transition-colors hover:bg-hover/30',
				hasChanges ? 'border-accent/40 ring-1 ring-accent/20' : 'border-border',
			)}>
			<div className="flex items-center justify-between border-b border-border/60 bg-muted px-3 py-2.5">
				{schema.bulkActions && schema.bulkActions.length > 0 && (
					<div className="flex items-center">
						<Checkbox
							id={`grid-checkbox-${rowId}`}
							checked={isSelected}
							onChange={() => onRowSelect(rowId)}
						/>
					</div>
				)}

				{schema.actions && schema.actions.length > 0 && (
					<div className="ml-auto">
						<TableActionsDropdown
							schema={schema}
							rowId={rowId}
							rowIndex={rowIndex}
							totalRows={totalRows}
							isOpen={openActionsRowId === rowId}
							onToggle={() => onToggleActions(rowId)}
							onAction={onRowAction}
						/>
					</div>
				)}
			</div>

			<>
				<style>
					{`
						.grid-card-body-${rowId} {
							grid-template-columns: repeat(1, minmax(0, 1fr));
						}
						@media (min-width: 768px) {
							.grid-card-body-${rowId} {
								grid-template-columns: repeat(${schema.gridColumns || 2}, minmax(0, 1fr));
							}
						}
					`}
				</style>
				<div className={`grid gap-4 p-4 grid-card-body-${rowId}`}>
					{visibleColumns.map(column => {
						const ColumnComponent = columnRegistry[column.type];

						if (!ColumnComponent) {
							return (
								<div key={column.name} className="text-sm">
									<div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
										{column.label || column.name}
									</div>
									<div className="text-fg-secondary">
										{translate('core:state.unknown_column', { type: column.type })}
									</div>
								</div>
							);
						}

						const isEditable = ['textinput', 'select', 'checkbox', 'toggle'].includes(column.type);
						const isFullWidth = column.gridSpanFull === true;

						return (
							<div key={column.name} className={cn('text-sm', isFullWidth && 'col-span-full')}>
								{!isFullWidth && (
									<div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-fg-muted">
										{column.label || column.name}
									</div>
								)}
								<div className="text-fg">
									<ColumnComponent
										column={column}
										record={row}
										rowIndex={rowIndex}
										onCellChange={
											isEditable
												? (value: any) => onCellChange(rowId, column.name, value)
												: undefined
										}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</>

			{hasChanges && (
				<div className="flex items-center justify-end gap-2 border-t border-border/60 bg-muted px-3 py-2.5">
					<PillButton
						variant="primary"
						onClick={() => onSaveRow(rowId)}
						title={translate('core:table.save_changes')}>
						{translate('core:common.save')}
					</PillButton>
					<PillButton
						variant="default"
						onClick={() => onResetRow(rowId)}
						title={translate('core:table.reset_changes')}>
						{translate('core:common.reset')}
					</PillButton>
				</div>
			)}
		</div>
	);
}
