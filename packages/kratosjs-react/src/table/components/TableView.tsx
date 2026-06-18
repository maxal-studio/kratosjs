import React from 'react';
import { TableHeader } from '../../components/table/TableHeader';
import { TableRow } from '../../components/table/TableRow';
import { Spinner } from '../../components/ui/Spinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorAlert } from '../../components/ui/ErrorAlert';
import { useTableContext } from '../TableContext';
import { TableQueryApi } from '../hooks/useTableQuery';
import { cn } from '../../utils/classNames';

export interface TableViewProps {
	query: TableQueryApi;
	/** When true, outer card wrapper is omitted (parent provides the surface). */
	embedded?: boolean;
}

/**
 * The classic table layout: header, rows, loading/empty states.
 * All row state and handlers come from TableContext.
 */
export function TableView({ query, embedded = false }: TableViewProps) {
	const {
		schema,
		visibleColumns,
		visibleActions,
		data,
		isLoading,
		error,
		setError,
		selectedRows,
		changedRows,
		openActionsRowId,
		onToggleActions,
		onRowSelect,
		onSelectAll,
		onCellChange,
		onRowAction,
		onSaveRow,
		onResetRow,
	} = useTableContext();

	const colSpan = visibleColumns.length + (schema.bulkActions?.length ? 1 : 0) + 1;

	return (
		<div className={cn(!embedded && 'overflow-hidden rounded-xl border border-border bg-surface')}>
			<div className="w-full overflow-x-auto">
				{error ? <ErrorAlert className="m-4" message={error} onDismiss={() => setError(null)} /> : null}
				<table className="w-full min-w-full" style={{ tableLayout: 'auto' }}>
					<TableHeader
						schema={schema}
						visibleColumns={visibleColumns}
						sortColumn={query.sortColumn}
						sortDirection={query.sortDirection}
						onSort={query.handleSort}
						selectedRowsCount={selectedRows.size}
						totalRows={data.length}
						onSelectAll={onSelectAll}
					/>
					<tbody>
						{isLoading ? (
							<tr>
								<td colSpan={colSpan} className="px-4 py-12 text-center">
									<Spinner label="Loading..." />
								</td>
							</tr>
						) : data.length === 0 ? (
							<tr>
								<td colSpan={colSpan}>
									<EmptyState
										title="No records found"
										description="Try adjusting your search or filters."
									/>
								</td>
							</tr>
						) : (
							data.map((row, rowIndex) => {
								const rowId = row.id || row._id || rowIndex;
								return (
									<TableRow
										key={rowId}
										schema={{ ...schema, actions: visibleActions }}
										row={row}
										rowIndex={rowIndex}
										totalRows={data.length}
										rowId={rowId}
										visibleColumns={visibleColumns}
										isSelected={selectedRows.has(rowId)}
										hasChanges={changedRows.has(rowId)}
										openActionsRowId={openActionsRowId}
										onRowSelect={onRowSelect}
										onCellChange={onCellChange}
										onRowAction={onRowAction}
										onSaveRow={onSaveRow}
										onResetRow={onResetRow}
										onToggleActions={onToggleActions}
									/>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
