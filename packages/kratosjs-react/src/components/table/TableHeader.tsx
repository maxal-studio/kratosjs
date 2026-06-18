import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { cn } from '../../utils/classNames';
import { Checkbox } from '../Checkbox';

interface TableHeaderProps {
	schema: SerializedTable;
	visibleColumns: any[];
	sortColumn?: string;
	sortDirection: 'asc' | 'desc';
	onSort: (column: string) => void;
	selectedRowsCount: number;
	totalRows: number;
	onSelectAll: () => void;
}

export function TableHeader({
	schema,
	visibleColumns,
	sortColumn,
	sortDirection,
	onSort,
	selectedRowsCount,
	totalRows,
	onSelectAll,
}: TableHeaderProps) {
	return (
		<thead className="sticky top-0 z-30 border-b border-border bg-base/80 backdrop-blur-sm">
			<tr>
				{schema.bulkActions && schema.bulkActions.length > 0 && (
					<th className="w-12 px-4 py-3">
						<Checkbox checked={selectedRowsCount === totalRows && totalRows > 0} onChange={onSelectAll} />
					</th>
				)}

				{visibleColumns.map(column => {
					const width = column.width
						? typeof column.width === 'number'
							? `${column.width}px`
							: /^\d+$/.test(column.width)
								? `${column.width}px`
								: column.width
						: undefined;

					const widthStyle = width ? { width, minWidth: width, maxWidth: width } : undefined;
					const isActiveSortColumn = sortColumn === column.name;

					return (
						<th
							key={column.name}
							className={cn(
								'px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-fg-muted',
								column.sortable && 'cursor-pointer select-none hover:text-fg-secondary',
							)}
							onClick={() => column.sortable && onSort(column.name)}
							style={widthStyle}>
							<div className="flex items-center gap-1.5">
								<span>{column.label || column.name}</span>
								{column.sortable && (
									<span className="inline-flex flex-col">
										<ChevronUp
											className={cn(
												'-mb-1 h-3 w-3',
												isActiveSortColumn && sortDirection === 'asc'
													? 'text-fg'
													: 'text-fg-muted/60',
											)}
										/>
										<ChevronDown
											className={cn(
												'h-3 w-3',
												isActiveSortColumn && sortDirection === 'desc'
													? 'text-fg'
													: 'text-fg-muted/60',
											)}
										/>
									</span>
								)}
							</div>
						</th>
					);
				})}

				<th className="sticky right-0 z-20 border-l border-border bg-base px-4 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-fg-muted shadow-[-6px_0_10px_-6px] shadow-black/10">
					{schema.actions && schema.actions.length > 0 ? (
						<span className="hidden sm:inline">Actions</span>
					) : (
						''
					)}
				</th>
			</tr>
		</thead>
	);
}
