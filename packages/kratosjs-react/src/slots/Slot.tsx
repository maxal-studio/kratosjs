import React from 'react';
import { ErrorBoundary } from '../components/errors/ErrorBoundary';
import { useSlot } from '../contexts/SlotRegistryContext';
import type { SlotContext, SlotContribution, SlotName } from './types';

/**
 * Render one contribution. Both a React component and a plain
 * `(ctx) => ReactNode` are function components of the context, so a single
 * `createElement` path covers both forms.
 */
export function renderSlot(contribution: SlotContribution, context: SlotContext): React.ReactNode {
	return (
		<ErrorBoundary key={contribution.id} label={`slot "${context.slot}" (${contribution.id})`}>
			{React.createElement(contribution.render as React.ComponentType<SlotContext>, context)}
		</ErrorBoundary>
	);
}

export interface SlotProps {
	/** The slot to render. */
	name: SlotName;
	/** Context passed to each contribution. `slot` is filled in automatically. */
	context?: Omit<SlotContext, 'slot'>;
	/** Optional wrapper element type. Defaults to a Fragment (no DOM). */
	as?: React.ElementType;
	/** className for the wrapper (ignored when `as` is omitted). */
	className?: string;
}

/**
 * Renders every contribution registered for `name`, in order, each isolated by
 * an `ErrorBoundary`. Renders nothing (no wrapper DOM) when the slot is empty,
 * so slots stay invisible until something is contributed.
 */
export function Slot({ name, context, as, className }: SlotProps) {
	const contributions = useSlot(name);
	if (contributions.length === 0) return null;

	const fullContext: SlotContext = { ...context, slot: name };
	const children = contributions.map(contribution => renderSlot(contribution, fullContext));

	if (as) {
		const Wrapper = as;
		return <Wrapper className={className}>{children}</Wrapper>;
	}
	return <>{children}</>;
}
