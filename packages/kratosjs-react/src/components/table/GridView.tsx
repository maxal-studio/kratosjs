import React from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { GridCard } from './GridCard';
import { cn } from '../../utils/classNames';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { ErrorAlert } from '../ui/ErrorAlert';
import { translate } from '../../i18n/activeLocale';

interface GridViewProps {
	schema: SerializedTable;
	data: any[];
	visibleColumns: any[];
	selectedRows: Set<any>;
	changedRows: Map<any, any>;
	openActionsRowId: any;
	onRowSelect: (rowId: any) => void;
	onCellChange: (rowId: any, columnName: string, value: any) => void;
	onRowAction: (actionName: string, rowId: any) => void;
	onSaveRow: (rowId: any) => void;
	onResetRow: (rowId: any) => void;
	onToggleActions: (rowId: any) => void;
	isLoading: boolean;
	error: string | null;
	visibleActions: any[];
	/** When true, loading/empty/error states omit outer card wrapper. */
	embedded?: boolean;
}

export function GridView({
	schema,
	data,
	visibleColumns,
	selectedRows,
	changedRows,
	openActionsRowId,
	onRowSelect,
	onCellChange,
	onRowAction,
	onSaveRow,
	onResetRow,
	onToggleActions,
	isLoading,
	error,
	visibleActions,
	embedded = false,
}: GridViewProps) {
	const generateGridClasses = (): string => {
		const config = schema.contentGrid || { md: 2, xl: 3 };
		const classes = ['grid', 'grid-cols-1'];

		const breakpointMap: Record<string, string> = {
			sm: 'sm:grid-cols-',
			md: 'md:grid-cols-',
			lg: 'lg:grid-cols-',
			xl: 'xl:grid-cols-',
			'2xl': '2xl:grid-cols-',
		};

		for (const [breakpoint, cols] of Object.entries(config)) {
			const prefix = breakpointMap[breakpoint];
			if (prefix) {
				classes.push(`${prefix}${cols}`);
			}
		}

		classes.push('gap-4');
		return classes.join(' ');
	};

	const gridClasses = generateGridClasses();
	const stateWrapper = embedded ? 'px-4 py-12' : 'rounded-xl border border-border bg-surface px-4 py-12';

	if (isLoading) {
		return (
			<div className={stateWrapper}>
				<div className="flex items-center justify-center">
					<Spinner label={translate('core:common.loading_ellipsis')} />
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={embedded ? 'p-4' : 'rounded-xl border border-border bg-surface p-4'}>
				<ErrorAlert message={error} />
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<div className={stateWrapper}>
				<EmptyState
					title={translate('core:table.no_records')}
					description={translate('core:table.no_records_hint')}
				/>
			</div>
		);
	}

	return (
		<div className={cn(gridClasses, embedded && 'p-4')}>
			{data.map((row, rowIndex) => {
				const rowId = row.id || row._id || rowIndex;
				const hasChanges = changedRows.has(rowId);
				const isSelected = selectedRows.has(rowId);

				const filteredSchema = {
					...schema,
					actions: visibleActions,
				};

				return (
					<GridCard
						key={rowId}
						schema={filteredSchema}
						row={row}
						rowIndex={rowIndex}
						totalRows={data.length}
						rowId={rowId}
						visibleColumns={visibleColumns}
						isSelected={isSelected}
						hasChanges={hasChanges}
						openActionsRowId={openActionsRowId}
						onRowSelect={onRowSelect}
						onCellChange={onCellChange}
						onRowAction={onRowAction}
						onSaveRow={onSaveRow}
						onResetRow={onResetRow}
						onToggleActions={onToggleActions}
					/>
				);
			})}
		</div>
	);
}
