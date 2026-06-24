import React from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { useColumnRegistry } from '../../contexts/ColumnRegistryContext';
import { cn } from '../../utils/classNames';
import { TableActionsDropdown } from './TableActionsDropdown';
import { Checkbox } from '../Checkbox';
import { PillButton } from '../ui/PillButton';
import { translate } from '../../i18n/activeLocale';

interface TableRowProps {
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

export function TableRow({
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
}: TableRowProps) {
	const columnRegistry = useColumnRegistry();

	const rowBg = cn(
		schema.striped && !hasChanges && (rowIndex % 2 === 1 ? 'bg-muted/25' : 'bg-surface'),
		hasChanges && 'bg-accent-soft/20',
	);

	const stickyActionsBg = cn(
		'border-l border-border shadow-[-6px_0_10px_-6px] shadow-black/10',
		hasChanges ? 'bg-accent-soft' : schema.striped && rowIndex % 2 === 1 ? 'bg-muted' : 'bg-surface',
		'group-hover:bg-hover',
	);

	return (
		<tr
			className={cn(
				'group border-b border-border/60 transition-colors last:border-b-0 hover:bg-hover/70',
				hasChanges && 'ring-1 ring-inset ring-accent/20',
				rowBg,
			)}>
			{schema.bulkActions && schema.bulkActions.length > 0 && (
				<td className="w-12 px-4 py-3">
					<Checkbox id={`checkbox-${rowId}`} checked={isSelected} onChange={() => onRowSelect(rowId)} />
				</td>
			)}

			{visibleColumns.map(column => {
				const ColumnComponent = columnRegistry[column.type];
				const isMediaColumn = ['image', 'video', 'media'].includes(column.type);

				const width =
					!isMediaColumn && column.width
						? typeof column.width === 'number'
							? `${column.width}px`
							: /^\d+$/.test(column.width)
								? `${column.width}px`
								: column.width
						: undefined;

				const widthStyle = width ? { width, minWidth: width, maxWidth: width } : undefined;

				if (!ColumnComponent) {
					return (
						<td key={column.name} className="px-4 py-3 text-sm text-fg-secondary" style={widthStyle}>
							Unknown column type: {column.type}
						</td>
					);
				}

				const isEditable = ['textinput', 'select', 'checkbox', 'toggle'].includes(column.type);

				return (
					<td key={column.name} className="px-4 py-3 text-sm text-fg whitespace-nowrap" style={widthStyle}>
						<ColumnComponent
							column={column}
							record={row}
							rowIndex={rowIndex}
							onCellChange={
								isEditable ? (value: any) => onCellChange(rowId, column.name, value) : undefined
							}
						/>
					</td>
				);
			})}

			<td
				className={cn('sticky right-0 px-4 py-3 text-right transition-colors', stickyActionsBg)}
				style={{
					zIndex: openActionsRowId === rowId ? 50 : 10,
				}}>
				<div className="flex items-center justify-end gap-2">
					{hasChanges && (
						<>
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
							<div className="hidden h-5 w-px bg-border sm:block" aria-hidden />
						</>
					)}
					{schema.actions && schema.actions.length > 0 && (
						<TableActionsDropdown
							schema={schema}
							rowId={rowId}
							rowIndex={rowIndex}
							totalRows={totalRows}
							isOpen={openActionsRowId === rowId}
							onToggle={() => onToggleActions(rowId)}
							onAction={onRowAction}
						/>
					)}
				</div>
			</td>
		</tr>
	);
}
