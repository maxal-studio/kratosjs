import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTableQuery } from './useTableQuery';

const makeSchema = (overrides: Record<string, unknown> = {}) =>
	({
		columns: [],
		recordsPerPage: 25,
		filters: [
			{ name: 'status', type: 'select', default: 'active' },
			{ name: 'advanced', type: 'queryBuilder' },
		],
		tabs: [
			{ key: 'all', label: 'All' },
			{ key: 'archived', label: 'Archived', queryBuilder: [{ field: 'archived', operator: 'eq', value: true }] },
		],
		defaultSort: { column: 'name', direction: 'asc' },
		...overrides,
	}) as any;

/** The schema must be referentially stable across renders, as in real usage. */
const renderQuery = (overrides: Record<string, unknown> = {}) => {
	const schema = makeSchema(overrides);
	return renderHook(() => useTableQuery(schema));
};

describe('useTableQuery', () => {
	it('initializes from the schema', () => {
		const { result } = renderQuery();
		expect(result.current.sortColumn).toBe('name');
		expect(result.current.sortDirection).toBe('asc');
		expect(result.current.perPage).toBe(25);
		expect(result.current.filters).toEqual({ status: 'active' });
		expect(result.current.activeTab).toBeNull();
	});

	it('selects the default tab when one is flagged', () => {
		const { result } = renderQuery({ tabs: [{ key: 'a' }, { key: 'b', default: true }] });
		expect(result.current.activeTab).toBe('b');
	});

	it('toggles sort direction and resets the page', () => {
		const { result } = renderQuery();
		act(() => result.current.handlePageChange(3));
		expect(result.current.currentPage).toBe(3);

		act(() => result.current.handleSort('name'));
		expect(result.current.sortDirection).toBe('desc');
		expect(result.current.currentPage).toBe(1);

		act(() => result.current.handleSort('email'));
		expect(result.current.sortColumn).toBe('email');
		expect(result.current.sortDirection).toBe('asc');
	});

	it('search resets the page', () => {
		const { result } = renderQuery();
		act(() => result.current.handlePageChange(2));
		act(() => result.current.handleSearch('jane'));
		expect(result.current.searchQuery).toBe('jane');
		expect(result.current.currentPage).toBe(1);
	});

	it('manual filter change clears the active tab', () => {
		const { result } = renderQuery();
		act(() => result.current.handleTabClick('archived'));
		expect(result.current.activeTab).toBe('archived');

		act(() => result.current.handleFilterChange('status', 'inactive'));
		expect(result.current.activeTab).toBeNull();
		expect(result.current.filters).toEqual({ status: 'inactive' });
	});

	it('removes filters set to empty values', () => {
		const { result } = renderQuery();
		act(() => result.current.handleFilterChange('status', ''));
		expect(result.current.filters).toEqual({});
	});

	it('merges active tab rules into queryParams as __activeTab', () => {
		const { result } = renderQuery();
		act(() => result.current.handleTabClick('archived'));
		expect(result.current.queryParams.queryBuilders?.__activeTab).toEqual([
			{ field: 'archived', operator: 'eq', value: true },
		]);

		act(() => result.current.handleTabClick(null));
		expect(result.current.queryParams.queryBuilders).toBeUndefined();
	});

	it('tracks query-builder filters separately', () => {
		const { result } = renderQuery();
		const rules = [{ field: 'age', operator: 'gt', value: 18 }];
		act(() => result.current.handleFilterChange('advanced', rules, true));
		expect(result.current.queryBuilders.advanced).toEqual(rules);
		expect(result.current.queryParams.queryBuilders?.advanced).toEqual(rules);

		act(() => result.current.handleFilterChange('advanced', [], true));
		expect(result.current.queryBuilders.advanced).toBeUndefined();
	});

	it('clear filters restores schema defaults', () => {
		const { result } = renderQuery();
		act(() => result.current.handleFilterChange('status', 'x'));
		act(() => result.current.handleClearFilters());
		expect(result.current.filters).toEqual({ status: 'active' });
	});

	it('page size change resets to page 1', () => {
		const { result } = renderQuery();
		act(() => result.current.handlePageChange(4));
		act(() => result.current.handlePageSizeChange(50));
		expect(result.current.perPage).toBe(50);
		expect(result.current.currentPage).toBe(1);
	});
});
