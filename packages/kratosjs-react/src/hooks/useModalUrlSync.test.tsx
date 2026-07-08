import { describe, expect, it, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ResourceModalProvider, useResourceModal } from '../contexts/ResourceModalContext';
import { useModalUrlSync } from './useModalUrlSync';

// MemoryRouter keeps its own in-memory history and never touches window.location,
// while useModalUrlSync writes to window.history directly. jsdom's replaceState
// updates window.location, so we assert on window.location.pathname.
function Harness() {
	const { modalStack, openModal, closeModal } = useResourceModal();
	useModalUrlSync(modalStack);
	return (
		<div>
			<button onClick={() => openModal('products', 'view', '1')}>open-product</button>
			<button onClick={() => openModal('orders', 'view', '5')}>open-order</button>
			<button onClick={() => openModal('customers', 'view', '9')}>open-customer</button>
			<button onClick={() => openModal('products', 'action', '1', 'restock', 'Restock')}>open-action</button>
			<button onClick={() => closeModal()}>close</button>
			<span data-testid="depth">{modalStack.length}</span>
		</div>
	);
}

function renderHarness() {
	return render(
		<MemoryRouter>
			<ResourceModalProvider>
				<Harness />
			</ResourceModalProvider>
		</MemoryRouter>,
	);
}

beforeEach(() => {
	window.history.replaceState(null, '', '/');
});

describe('useModalUrlSync', () => {
	it('updates the URL when the first modal opens', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByText('open-product'));

		expect(window.location.pathname).toBe('/products/1');
	});

	it('updates the URL for a modal opened from inside another modal (the reported bug)', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByText('open-product'));
		expect(window.location.pathname).toBe('/products/1');

		// Second modal, opened on top of the first — this is the case that previously
		// left the address bar unchanged.
		await user.click(screen.getByText('open-order'));
		expect(window.location.pathname).toBe('/orders/5');

		// Third modal, for consistency.
		await user.click(screen.getByText('open-customer'));
		expect(window.location.pathname).toBe('/customers/9');
		expect(screen.getByTestId('depth')).toHaveTextContent('3');
	});

	it('leaves the URL on the parent record when an action modal opens', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByText('open-product'));
		expect(window.location.pathname).toBe('/products/1');

		await user.click(screen.getByText('open-action'));

		// Action modals are not deep-linkable — the parent's URL keeps showing.
		expect(window.location.pathname).toBe('/products/1');
		expect(screen.getByTestId('depth')).toHaveTextContent('2');
	});

	it('does not write the URL when it already matches the top modal', async () => {
		const user = userEvent.setup();
		window.history.replaceState(null, '', '/products/1');
		renderHarness();

		const spy = vi.spyOn(window.history, 'replaceState');
		await user.click(screen.getByText('open-product'));

		expect(window.location.pathname).toBe('/products/1');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});

	it('does not write the URL when a modal is closed (close handlers own that path)', async () => {
		const user = userEvent.setup();
		renderHarness();

		await user.click(screen.getByText('open-product'));
		await user.click(screen.getByText('open-order'));
		expect(window.location.pathname).toBe('/orders/5');

		const spy = vi.spyOn(window.history, 'replaceState');
		await user.click(screen.getByText('close'));

		expect(screen.getByTestId('depth')).toHaveTextContent('1');
		expect(spy).not.toHaveBeenCalled();
		spy.mockRestore();
	});
});
