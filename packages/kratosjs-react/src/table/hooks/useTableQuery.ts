import { useEffect, useMemo, useState } from 'react';
import { SerializedTable } from '@maxal_studio/kratosjs';
import { QueryParams } from '../../api/tableApi';

export interface TableQueryState {
	searchQuery: string;
	sortColumn: string | undefined;
	sortDirection: 'asc' | 'desc';
	filters: Record<string, any>;
	queryBuilders: Record<string, any[]>;
	activeTab: string | null;
	currentPage: number;
	perPage: number;
}

export interface TableQueryApi extends TableQueryState {
	handleSearch: (query: string) => void;
	handleSort: (column: string) => void;
	handleFilterChange: (name: string, value: any, isQueryBuilder?: boolean) => void;
	handleTabClick: (tabKey: string | null) => void;
	handleClearFilters: () => void;
	handlePageChange: (page: number) => void;
	handlePageSizeChange: (size: number) => void;
	/** Request payload for TableApiClient.fetchData, with tab rules merged in */
	queryParams: QueryParams;
}

/**
 * All list-query state for a table: search, sort, filters, query builders,
 * tabs, and pagination — plus the handlers that keep them consistent
 * (changing any criterion resets to page 1; manual filtering clears the tab).
 */
export function useTableQuery(schema: SerializedTable): TableQueryApi {
	// Filter defaults come from the schema
	const initialFilters = useMemo(() => {
		const defaults: Record<string, any> = {};
		schema.filters?.forEach(filter => {
			if (filter.default !== undefined && filter.type !== 'queryBuilder') {
				defaults[filter.name] = filter.default;
			}
		});
		return defaults;
	}, [schema.filters]);

	const initialQueryBuilders = useMemo(() => {
		const defaults: Record<string, any[]> = {};
		schema.filters?.forEach(filter => {
			if (filter.type === 'queryBuilder' && Array.isArray(filter.default)) {
				defaults[filter.name] = filter.default;
			}
		});
		return defaults;
	}, [schema.filters]);

	const [searchQuery, setSearchQuery] = useState('');
	const [sortColumn, setSortColumn] = useState<string | undefined>(schema.defaultSort?.column);
	const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(schema.defaultSort?.direction || 'asc');
	const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
	const [queryBuilders, setQueryBuilders] = useState<Record<string, any[]>>(initialQueryBuilders);
	const [activeTab, setActiveTab] = useState<string | null>(() => {
		const tabs = schema.tabs as Array<{ default?: boolean; key: string }> | undefined;
		return tabs?.find(tab => tab.default === true)?.key ?? null;
	});
	const [currentPage, setCurrentPage] = useState(1);
	const [perPage, setPerPage] = useState(schema.recordsPerPage || 10);

	// Reset filters to defaults when the schema changes
	useEffect(() => {
		setFilters(initialFilters);
		setQueryBuilders(initialQueryBuilders);
	}, [initialFilters, initialQueryBuilders]);

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		setCurrentPage(1);
	};

	const handleSort = (column: string) => {
		setSortDirection(sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc');
		setSortColumn(column);
		setCurrentPage(1);
	};

	const handleFilterChange = (name: string, value: any, isQueryBuilder: boolean = false) => {
		// Manual filtering clears the active tab
		setActiveTab(null);

		if (isQueryBuilder) {
			setQueryBuilders(prev => {
				const next = { ...prev };
				if (value === undefined || (Array.isArray(value) && value.length === 0)) {
					delete next[name];
				} else {
					next[name] = value;
				}
				return next;
			});
		} else {
			setFilters(prev => {
				const next = { ...prev };
				if (value === '' || value === undefined) {
					delete next[name];
				} else {
					next[name] = value;
				}
				return next;
			});
		}
		setCurrentPage(1);
	};

	const handleTabClick = (tabKey: string | null) => {
		setActiveTab(tabKey);
		setCurrentPage(1);
	};

	const handleClearFilters = () => {
		setFilters(initialFilters);
		setQueryBuilders(initialQueryBuilders);
		setCurrentPage(1);
	};

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
	};

	const handlePageSizeChange = (size: number) => {
		setPerPage(size);
		setCurrentPage(1);
	};

	const queryParams = useMemo<QueryParams>(() => {
		// Merge the active tab's query-builder rules into the request
		const finalQueryBuilders = { ...queryBuilders };
		const tabs = schema.tabs as Array<{ key: string; queryBuilder?: any[] }> | undefined;
		if (activeTab && tabs) {
			const selectedTab = tabs.find(tab => tab.key === activeTab);
			if (selectedTab?.queryBuilder && selectedTab.queryBuilder.length > 0) {
				finalQueryBuilders.__activeTab = selectedTab.queryBuilder;
			}
		}

		return {
			page: currentPage,
			perPage,
			search: searchQuery || undefined,
			sort: sortColumn,
			sortDirection,
			filters,
			queryBuilders: Object.keys(finalQueryBuilders).length > 0 ? finalQueryBuilders : undefined,
		};
	}, [queryBuilders, schema.tabs, activeTab, currentPage, perPage, searchQuery, sortColumn, sortDirection, filters]);

	return {
		searchQuery,
		sortColumn,
		sortDirection,
		filters,
		queryBuilders,
		activeTab,
		currentPage,
		perPage,
		handleSearch,
		handleSort,
		handleFilterChange,
		handleTabClick,
		handleClearFilters,
		handlePageChange,
		handlePageSizeChange,
		queryParams,
	};
}
