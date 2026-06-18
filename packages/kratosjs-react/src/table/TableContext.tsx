import React, { createContext, useContext } from 'react';
import { SerializedColumn, SerializedTable } from '@maxal_studio/kratosjs';

/**
 * Shared table state and handlers for row-level components (TableRow,
 * GridCard, TableView). Replaces the 15-prop drilling of v1.
 */
export interface TableContextValue {
	schema: SerializedTable & { canCreate?: boolean; canEdit?: boolean; canDelete?: boolean; canView?: boolean };
	visibleColumns: SerializedColumn[];
	/** Actions filtered by the resource's can* capabilities */
	visibleActions: any[];
	data: any[];
	isLoading: boolean;
	error: string | null;
	setError: (error: string | null) => void;
	selectedRows: Set<any>;
	changedRows: Map<any, any>;
	openActionsRowId: any;
	onToggleActions: (rowId: any) => void;
	onRowSelect: (rowId: any) => void;
	onSelectAll: () => void;
	onCellChange: (rowId: any, columnName: string, value: any) => void;
	onRowAction: (actionName: string, rowId: any) => void;
	onSaveRow: (rowId: any) => void;
	onResetRow: (rowId: any) => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ value, children }: { value: TableContextValue; children: React.ReactNode }) {
	return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
}

export function useTableContext(): TableContextValue {
	const context = useContext(TableContext);
	if (!context) {
		throw new Error('useTableContext must be used within a TableRenderer');
	}
	return context;
}
