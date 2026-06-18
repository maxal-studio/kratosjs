import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useColumnVisibility } from './useColumnVisibility';

const columns = [
	{ name: 'id', toggleable: false },
	{ name: 'name' },
	{ name: 'email' },
	{ name: 'internal', hidden: true },
	{ name: 'notes', toggledHiddenByDefault: true },
] as any[];

describe('useColumnVisibility', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('hides toggledHiddenByDefault columns on first visit and persists the default', () => {
		const { result } = renderHook(() => useColumnVisibility(columns, 'users'));

		expect(result.current.visibleColumns.map(c => c.name)).toEqual(['id', 'name', 'email']);
		expect(JSON.parse(localStorage.getItem('kratosjs_column_visibility_users')!)).toEqual(['notes']);
	});

	it('always renders non-toggleable columns and never renders hidden ones', () => {
		const { result } = renderHook(() => useColumnVisibility(columns, 'users'));
		const names = result.current.visibleColumns.map(c => c.name);
		expect(names).toContain('id');
		expect(names).not.toContain('internal');
	});

	it('respects stored preferences', () => {
		localStorage.setItem('kratosjs_column_visibility_users', JSON.stringify(['email']));
		const { result } = renderHook(() => useColumnVisibility(columns, 'users'));
		expect(result.current.visibleColumns.map(c => c.name)).toEqual(['id', 'name', 'notes']);
	});

	it('toggling persists to localStorage and updates the view', () => {
		const { result } = renderHook(() => useColumnVisibility(columns, 'users'));

		act(() => result.current.handleColumnToggle('email', false));
		expect(result.current.visibleColumns.map(c => c.name)).toEqual(['id', 'name']);
		expect(JSON.parse(localStorage.getItem('kratosjs_column_visibility_users')!).sort()).toEqual([
			'email',
			'notes',
		]);

		act(() => result.current.handleColumnToggle('notes', true));
		expect(result.current.visibleColumns.map(c => c.name)).toEqual(['id', 'name', 'notes']);
	});
});
