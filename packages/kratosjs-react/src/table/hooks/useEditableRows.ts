import React, { useState } from 'react';

export interface EditableRowsApi {
	changedRows: Map<any, any>;
	handleCellChange: (rowId: any, columnName: string, newValue: any) => void;
	handleSaveRow: (rowId: any) => Promise<void>;
	handleResetRow: (rowId: any) => void;
	/** Reset change tracking after a (re)load */
	resetTracking: (rows: any[]) => void;
}

export interface UseEditableRowsOptions {
	data: any[];
	setData: React.Dispatch<React.SetStateAction<any[]>>;
	/** Persists the changed cells of one row */
	saveRecord: (rowId: any, changes: any) => Promise<void>;
	/** Notified when a save fails (e.g. show a toast) */
	onSaveError?: (error: Error) => void;
}

const rowIdOf = (row: any) => row.id || row._id;

/**
 * Change tracking for inline-editable columns: per-row dirty state,
 * optimistic cell updates, save and reset.
 */
export function useEditableRows({ data, setData, saveRecord, onSaveError }: UseEditableRowsOptions): EditableRowsApi {
	const [changedRows, setChangedRows] = useState<Map<any, any>>(new Map());
	const [originalData, setOriginalData] = useState<Map<any, any>>(new Map());

	const resetTracking = (rows: any[]) => {
		const originalMap = new Map();
		rows.forEach(row => originalMap.set(rowIdOf(row), { ...row }));
		setOriginalData(originalMap);
		setChangedRows(new Map());
	};

	const handleCellChange = (rowId: any, columnName: string, newValue: any) => {
		// Optimistic UI update
		setData(prevData => prevData.map(row => (rowIdOf(row) === rowId ? { ...row, [columnName]: newValue } : row)));

		setChangedRows(prev => {
			const next = new Map(prev);
			next.set(rowId, { ...(next.get(rowId) || {}), [columnName]: newValue });
			return next;
		});
	};

	const handleSaveRow = async (rowId: any) => {
		const changes = changedRows.get(rowId);
		if (!changes) return;

		try {
			await saveRecord(rowId, changes);

			// The saved row becomes the new original
			setOriginalData(prev => {
				const next = new Map(prev);
				const currentRow = data.find(row => rowIdOf(row) === rowId);
				if (currentRow) {
					next.set(rowId, { ...currentRow });
				}
				return next;
			});
			setChangedRows(prev => {
				const next = new Map(prev);
				next.delete(rowId);
				return next;
			});
		} catch (err) {
			console.error('Error saving row:', err);
			onSaveError?.(err instanceof Error ? err : new Error('Failed to save changes'));
		}
	};

	const handleResetRow = (rowId: any) => {
		const original = originalData.get(rowId);
		if (!original) return;

		setData(prevData => prevData.map(row => (rowIdOf(row) === rowId ? { ...original } : row)));
		setChangedRows(prev => {
			const next = new Map(prev);
			next.delete(rowId);
			return next;
		});
	};

	return { changedRows, handleCellChange, handleSaveRow, handleResetRow, resetTracking };
}
