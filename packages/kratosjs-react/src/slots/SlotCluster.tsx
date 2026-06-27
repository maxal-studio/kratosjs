import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { IconButton } from '../components/ui';
import { cn } from '../utils/classNames';
import { translate } from '../i18n/activeLocale';
import { useSlot } from '../contexts/SlotRegistryContext';
import { renderSlot } from './Slot';
import type { SlotContext, SlotContribution, SlotName } from './types';

/** A self-contained "…" dropdown holding overflow slot contributions. */
function OverflowMenu({
	items,
	context,
	className,
}: {
	items: SlotContribution[];
	context: SlotContext;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const onClick = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
		};
		const onEsc = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpen(false);
		};
		document.addEventListener('mousedown', onClick);
		document.addEventListener('keydown', onEsc);
		return () => {
			document.removeEventListener('mousedown', onClick);
			document.removeEventListener('keydown', onEsc);
		};
	}, [open]);

	if (items.length === 0) return null;

	return (
		<div className={cn('relative', className)} ref={ref}>
			<IconButton
				variant="ghost"
				size="sm"
				aria-label={translate('core:common.more')}
				aria-expanded={open}
				aria-haspopup="menu"
				className="h-9 w-9 shrink-0"
				onClick={() => setOpen(o => !o)}>
				<MoreHorizontal className="h-4 w-4" />
			</IconButton>
			{open && (
				<div
					role="menu"
					className="absolute right-0 z-50 mt-2 flex w-56 flex-col gap-1 rounded-xl border border-border bg-raised p-2 shadow-soft-lg">
					{items.map(item => renderSlot(item, context))}
				</div>
			)}
		</div>
	);
}

export interface SlotClusterProps {
	/** The slot to render. */
	name: SlotName;
	/** Context passed to each contribution. `slot` is filled in automatically. */
	context?: Omit<SlotContext, 'slot'>;
	/**
	 * How many contributions render inline on `sm`+ screens before the rest
	 * collapse into a "…" menu. Below `sm`, everything collapses. Default 2.
	 */
	maxInline?: number;
	/** className for the inline flex row. */
	className?: string;
}

/**
 * A responsive slot for tight horizontal areas (header right, table toolbar).
 * On `sm`+ the first `maxInline` items render inline and any extras fall into a
 * "…" dropdown; below `sm` every item collapses into the dropdown, so a crowded
 * slot can never overflow a phone-width row regardless of contributor count.
 */
export function SlotCluster({ name, context, maxInline = 2, className }: SlotClusterProps) {
	const contributions = useSlot(name);
	if (contributions.length === 0) return null;

	const fullContext: SlotContext = { ...context, slot: name };
	const inline = contributions.slice(0, maxInline);
	const overflow = contributions.slice(maxInline);

	return (
		<>
			{/* sm+ : inline items + (optional) overflow menu */}
			<div className={cn('hidden items-center gap-1 sm:flex sm:gap-2', className)}>
				{inline.map(item => (
					<div key={item.id} className="shrink-0">
						{renderSlot(item, fullContext)}
					</div>
				))}
				<OverflowMenu items={overflow} context={fullContext} />
			</div>
			{/* < sm : everything in the overflow menu */}
			<OverflowMenu items={contributions} context={fullContext} className="sm:hidden" />
		</>
	);
}
