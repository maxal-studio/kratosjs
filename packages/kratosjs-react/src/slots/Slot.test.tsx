import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slot } from './Slot';
import { SlotRegistryProvider } from '../contexts/SlotRegistryContext';
import type { ResolvedSlots, SlotContext } from './types';

function renderSlot(slots: ResolvedSlots, context?: Omit<SlotContext, 'slot'>) {
	return render(
		<SlotRegistryProvider slots={slots}>
			<Slot name="header.right" context={context} />
		</SlotRegistryProvider>,
	);
}

describe('Slot', () => {
	it('renders nothing when the slot has no contributions', () => {
		const { container } = renderSlot({});
		expect(container).toBeEmptyDOMElement();
	});

	it('renders multiple contributions in their resolved order', () => {
		renderSlot({
			'header.right': [
				{ id: 'one', render: () => <span data-testid="item">one</span> },
				{ id: 'two', render: () => <span data-testid="item">two</span> },
			],
		});
		const items = screen.getAllByTestId('item');
		expect(items.map(el => el.textContent)).toEqual(['one', 'two']);
	});

	it('passes the slot context to a render function', () => {
		renderSlot(
			{
				'header.right': [
					{ id: 'ctx', render: ctx => <span data-testid="ctx">{String(ctx.resourceSlug)}</span> },
				],
			},
			{ resourceSlug: 'posts' },
		);
		expect(screen.getByTestId('ctx')).toHaveTextContent('posts');
		// slot name is injected automatically
	});

	it('passes the slot context to a component contribution', () => {
		function Comp(ctx: SlotContext) {
			return <span data-testid="comp">{ctx.slot}</span>;
		}
		renderSlot({ 'header.right': [{ id: 'comp', render: Comp }] });
		expect(screen.getByTestId('comp')).toHaveTextContent('header.right');
	});

	it('forwards slot-specific extras via context.data', () => {
		renderSlot(
			{
				'header.right': [
					{ id: 'd', render: ctx => <span data-testid="data">{String(ctx.data?.selectedCount)}</span> },
				],
			},
			{ data: { selectedCount: 3 } },
		);
		expect(screen.getByTestId('data')).toHaveTextContent('3');
	});

	describe('error isolation', () => {
		beforeEach(() => {
			// ErrorBoundary logs via console.error; silence it for these cases.
			vi.spyOn(console, 'error').mockImplementation(() => {});
		});
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('isolates a throwing contribution so siblings still render', () => {
			function Boom(): React.ReactElement {
				throw new Error('boom');
			}
			renderSlot({
				'header.right': [
					{ id: 'boom', render: Boom },
					{ id: 'ok', render: () => <span data-testid="ok">ok</span> },
				],
			});
			// Sibling still renders; the boundary shows its fallback for the failed one.
			expect(screen.getByTestId('ok')).toBeInTheDocument();
			expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
		});
	});
});
