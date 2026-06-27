import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlotCluster } from './SlotCluster';
import { SlotRegistryProvider } from '../contexts/SlotRegistryContext';
import type { ResolvedSlots } from './types';

function item(id: string, label: string) {
	return { id, render: () => <button data-testid="cluster-item">{label}</button> };
}

function renderCluster(slots: ResolvedSlots, maxInline?: number) {
	return render(
		<SlotRegistryProvider slots={slots}>
			<SlotCluster name="header.right" maxInline={maxInline} />
		</SlotRegistryProvider>,
	);
}

/** Trigger buttons are the overflow ("…") menu toggles, marked aria-haspopup="menu". */
function overflowTriggers(container: HTMLElement): HTMLButtonElement[] {
	return Array.from(container.querySelectorAll<HTMLButtonElement>('button[aria-haspopup="menu"]'));
}

describe('SlotCluster', () => {
	it('renders nothing when the slot is empty', () => {
		const { container } = renderCluster({});
		expect(container).toBeEmptyDOMElement();
	});

	it('renders the first maxInline contributions inline', () => {
		renderCluster(
			{
				'header.right': [item('a', 'one'), item('b', 'two'), item('c', 'three')],
			},
			2,
		);
		// Only the two inline items are mounted up-front; overflow lives in closed menus.
		const inline = screen.getAllByTestId('cluster-item');
		expect(inline.map(el => el.textContent)).toEqual(['one', 'two']);
	});

	it('collapses extras into a dropdown that opens and closes', () => {
		const { container } = renderCluster(
			{
				'header.right': [item('a', 'one'), item('b', 'two'), item('c', 'three')],
			},
			2,
		);

		// The third item is not shown until an overflow menu opens.
		expect(screen.queryByText('three')).not.toBeInTheDocument();

		// The desktop overflow trigger is the first haspopup button.
		const [desktopTrigger] = overflowTriggers(container);
		expect(desktopTrigger).toBeTruthy();

		fireEvent.click(desktopTrigger);
		expect(screen.getByText('three')).toBeInTheDocument();
		expect(desktopTrigger).toHaveAttribute('aria-expanded', 'true');

		// Escape closes it.
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(screen.queryByText('three')).not.toBeInTheDocument();
	});

	it('closes the menu on an outside click', () => {
		const { container } = renderCluster(
			{
				'header.right': [item('a', 'one'), item('b', 'two'), item('c', 'three')],
			},
			2,
		);
		const [desktopTrigger] = overflowTriggers(container);
		fireEvent.click(desktopTrigger);
		expect(screen.getByText('three')).toBeInTheDocument();

		fireEvent.mouseDown(document.body);
		expect(screen.queryByText('three')).not.toBeInTheDocument();
	});

	it('still exposes a mobile overflow menu even when nothing overflows', () => {
		// With maxInline >= count there are no desktop extras, but the < sm menu
		// holds everything so a phone-width row never overflows.
		const { container } = renderCluster({ 'header.right': [item('a', 'one')] }, 5);
		const triggers = overflowTriggers(container);
		// Desktop overflow has no items (renders null); only the mobile menu trigger remains.
		expect(triggers.length).toBe(1);

		// 'one' already renders inline for sm+; opening the mobile menu mounts a second copy.
		expect(screen.getAllByText('one')).toHaveLength(1);
		fireEvent.click(triggers[0]);
		expect(triggers[0]).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getAllByText('one')).toHaveLength(2);
	});
});
