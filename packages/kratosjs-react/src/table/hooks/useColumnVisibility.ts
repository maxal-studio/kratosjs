import { useEffect, useMemo, useState } from 'react';
import { SerializedColumn } from '@maxal_studio/kratosjs';
import { columnVisibilityStorage } from '../../utils/columnVisibilityStorage';

export interface ColumnVisibilityApi {
	/** Names of toggleable columns currently visible */
	visibleColumnNames: Set<string>;
	/** Columns to actually render (respects hidden/toggleable/user prefs) */
	visibleColumns: SerializedColumn[];
	handleColumnToggle: (columnName: string, visible: boolean) => void;
}

function toggleableOf(columns: SerializedColumn[] | undefined): SerializedColumn[] {
	return (columns || []).filter(col => col.hidden !== true && col.toggleable !== false);
}

/**
 * localStorage-backed column visibility, keyed per resource.
 * On first visit, columns flagged toggledHiddenByDefault are persisted as hidden.
 */
export function useColumnVisibility(columns: SerializedColumn[] | undefined, resourceKey: string): ColumnVisibilityApi {
	const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
		const stored = columnVisibilityStorage.getHiddenColumns(resourceKey);
		if (stored !== null) {
			return stored;
		}
		// First visit: apply schema defaults
		return toggleableOf(columns)
			.filter(col => col.toggledHiddenByDefault === true)
			.map(col => col.name);
	});

	// Persist defaults on first visit, and re-sync when the resource changes
	useEffect(() => {
		if (!columns || columns.length === 0) return;
		const stored = columnVisibilityStorage.getHiddenColumns(resourceKey);
		if (stored === null) {
			const defaults = toggleableOf(columns)
				.filter(col => col.toggledHiddenByDefault === true)
				.map(col => col.name);
			columnVisibilityStorage.setHiddenColumns(resourceKey, defaults);
			setHiddenColumns(defaults);
		} else {
			setHiddenColumns(stored);
		}
	}, [columns, resourceKey]);

	const visibleColumnNames = useMemo(() => {
		const visible = new Set<string>(toggleableOf(columns).map(col => col.name));
		hiddenColumns.forEach(name => visible.delete(name));
		return visible;
	}, [columns, hiddenColumns]);

	const visibleColumns = useMemo(() => {
		return (columns || []).filter(col => {
			if (col.hidden) return false;
			if (col.toggleable === false) return true;
			return visibleColumnNames.has(col.name);
		});
	}, [columns, visibleColumnNames]);

	const handleColumnToggle = (columnName: string, visible: boolean) => {
		setHiddenColumns(prev => {
			const next = visible ? prev.filter(name => name !== columnName) : [...new Set([...prev, columnName])];
			columnVisibilityStorage.setHiddenColumns(resourceKey, next);
			return next;
		});
	};

	return { visibleColumnNames, visibleColumns, handleColumnToggle };
}
