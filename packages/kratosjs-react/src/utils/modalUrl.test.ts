import { describe, expect, it } from 'vitest';
import { buildModalPath } from './modalUrl';
import { ModalState } from '../contexts/ResourceModalContext';

function modal(partial: Partial<ModalState> & Pick<ModalState, 'resource' | 'mode'>): ModalState {
	return { depth: 0, ...partial };
}

describe('buildModalPath', () => {
	it('maps a view modal to /resource/id', () => {
		expect(buildModalPath(modal({ resource: 'products', mode: 'view', recordId: '1' }))).toBe('/products/1');
	});

	it('maps an edit modal to /resource/id/edit', () => {
		expect(buildModalPath(modal({ resource: 'orders', mode: 'edit', recordId: '5' }))).toBe('/orders/5/edit');
	});

	it('maps a create modal to /resource/create (no id needed)', () => {
		expect(buildModalPath(modal({ resource: 'products', mode: 'create' }))).toBe('/products/create');
	});

	it('returns null for action modals (not deep-linkable)', () => {
		expect(
			buildModalPath(modal({ resource: 'products', mode: 'action', recordId: '1', actionName: 'restock' })),
		).toBeNull();
	});

	it('returns null when a view/edit modal is missing its record id', () => {
		expect(buildModalPath(modal({ resource: 'products', mode: 'view' }))).toBeNull();
		expect(buildModalPath(modal({ resource: 'products', mode: 'edit' }))).toBeNull();
	});
});
