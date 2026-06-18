import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import { useEditableRows } from './useEditableRows';

const initialRows = [
	{ id: 1, name: 'Jane' },
	{ id: 2, name: 'Bob' },
];

function setup(saveRecord = vi.fn().mockResolvedValue(undefined), onSaveError?: (e: Error) => void) {
	const hook = renderHook(() => {
		const [data, setData] = useState(initialRows);
		const editable = useEditableRows({ data, setData, saveRecord, onSaveError });
		return { data, editable };
	});
	act(() => hook.result.current.editable.resetTracking(initialRows));
	return hook;
}

describe('useEditableRows', () => {
	it('tracks cell changes optimistically', () => {
		const hook = setup();
		act(() => hook.result.current.editable.handleCellChange(1, 'name', 'Janet'));

		expect(hook.result.current.data.find(r => r.id === 1)?.name).toBe('Janet');
		expect(hook.result.current.editable.changedRows.get(1)).toEqual({ name: 'Janet' });
	});

	it('saves only the changed cells and clears the dirty state', async () => {
		const saveRecord = vi.fn().mockResolvedValue(undefined);
		const hook = setup(saveRecord);

		act(() => hook.result.current.editable.handleCellChange(1, 'name', 'Janet'));
		await act(() => hook.result.current.editable.handleSaveRow(1));

		expect(saveRecord).toHaveBeenCalledWith(1, { name: 'Janet' });
		expect(hook.result.current.editable.changedRows.has(1)).toBe(false);
	});

	it('reset restores the original row values', () => {
		const hook = setup();
		act(() => hook.result.current.editable.handleCellChange(2, 'name', 'Robert'));
		expect(hook.result.current.data.find(r => r.id === 2)?.name).toBe('Robert');

		act(() => hook.result.current.editable.handleResetRow(2));
		expect(hook.result.current.data.find(r => r.id === 2)?.name).toBe('Bob');
		expect(hook.result.current.editable.changedRows.has(2)).toBe(false);
	});

	it('reports save failures and keeps the dirty state', async () => {
		const onSaveError = vi.fn();
		const saveRecord = vi.fn().mockRejectedValue(new Error('boom'));
		const hook = setup(saveRecord, onSaveError);

		act(() => hook.result.current.editable.handleCellChange(1, 'name', 'Janet'));
		await act(() => hook.result.current.editable.handleSaveRow(1));

		expect(onSaveError).toHaveBeenCalled();
		expect(hook.result.current.editable.changedRows.has(1)).toBe(true);
	});

	it('does nothing when saving a row without changes', async () => {
		const saveRecord = vi.fn();
		const hook = setup(saveRecord);
		await act(() => hook.result.current.editable.handleSaveRow(1));
		expect(saveRecord).not.toHaveBeenCalled();
	});
});
