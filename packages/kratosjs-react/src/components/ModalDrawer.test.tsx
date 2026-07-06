import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceModalProvider } from '../contexts/ResourceModalContext';
import { ModalDrawer } from './ModalDrawer';

// The backdrop is the transparent overlay behind the panel (aria-hidden). It is the
// only element carrying the `transition-opacity` class.
function getBackdrop(container: HTMLElement): HTMLElement {
	const el = container.querySelector('.transition-opacity');
	if (!el) throw new Error('backdrop not found');
	return el as HTMLElement;
}

function renderDrawer(props: Partial<React.ComponentProps<typeof ModalDrawer>>) {
	return render(
		<ResourceModalProvider>
			<ModalDrawer isOpen onClose={() => {}} title="Test" depth={1} {...props}>
				<div>body</div>
			</ModalDrawer>
		</ResourceModalProvider>,
	);
}

describe('ModalDrawer backdrop', () => {
	it('closes the whole stack on backdrop click by default', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onCloseAll = vi.fn();
		const { container } = renderDrawer({ onClose, onCloseAll });

		await user.click(getBackdrop(container));

		expect(onCloseAll).toHaveBeenCalledTimes(1);
		expect(onClose).not.toHaveBeenCalled();
	});

	it('closes only this modal on backdrop click when backdropClosesAll is false (action modals)', async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		const onCloseAll = vi.fn();
		const { container } = renderDrawer({ onClose, onCloseAll, backdropClosesAll: false });

		await user.click(getBackdrop(container));

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onCloseAll).not.toHaveBeenCalled();
	});
});
