import React, { useEffect, useState } from 'react';
import { QueryParams, TableApiClient } from '../../api/tableApi';

export interface TableDataApi {
	data: any[];
	setData: React.Dispatch<React.SetStateAction<any[]>>;
	isLoading: boolean;
	setIsLoading: (loading: boolean) => void;
	error: string | null;
	setError: (error: string | null) => void;
	widgetData: Record<string, any>;
	totalRecords: number;
	/** Re-fetch with the current params */
	reload: () => Promise<void>;
}

export interface UseTableDataOptions {
	apiClient: TableApiClient;
	queryParams: QueryParams;
	/** Increment to force a refresh from outside */
	refreshKey?: number;
	/** Called with the fresh rows after every successful load */
	onLoaded?: (rows: any[]) => void;
}

/**
 * Fetches table rows whenever the query parameters (or refreshKey) change.
 * Tolerates StrictMode double-effects: loads are idempotent and stale
 * responses are dropped.
 */
export function useTableData({ apiClient, queryParams, refreshKey, onLoaded }: UseTableDataOptions): TableDataApi {
	const [data, setData] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [widgetData, setWidgetData] = useState<Record<string, any>>({});
	const [totalRecords, setTotalRecords] = useState(0);
	// Bumped by reload() so imperative refreshes re-run the effect
	const [reloadCounter, setReloadCounter] = useState(0);

	const onLoadedRef = React.useRef(onLoaded);
	onLoadedRef.current = onLoaded;

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setIsLoading(true);
			try {
				const result = await apiClient.fetchData(queryParams);
				if (cancelled) return;
				setData(result.data);
				setTotalRecords(result.pagination.total);
				setWidgetData(result.widgets || {});
				setError(null);
				onLoadedRef.current?.(result.data);
			} catch (err) {
				if (cancelled) return;
				setError(err instanceof Error ? err.message : 'Failed to load data');
				console.error('Error loading table data:', err);
			} finally {
				if (!cancelled) {
					setIsLoading(false);
				}
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [apiClient, queryParams, refreshKey, reloadCounter]);

	const reload = async () => {
		setReloadCounter(prev => prev + 1);
	};

	return {
		data,
		setData,
		isLoading,
		setIsLoading,
		error,
		setError,
		widgetData,
		totalRecords,
		reload,
	};
}
