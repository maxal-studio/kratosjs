import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { List } from 'lucide-react';
import { translate } from '../../i18n/activeLocale';

export interface ChartLegendItem {
	label: string;
	color: string;
}

export interface ChartLegendPopoverProps {
	items: ChartLegendItem[];
}

interface PopoverCoords {
	right: number;
	top?: number;
	bottom?: number;
	maxHeight: number;
}

const GAP = 8;
const MARGIN = 16;
const CLOSE_DELAY = 120;

/**
 * Space-free chart legend. Renders a small icon in the widget header; the legend
 * itself appears in a portal-mounted popover on hover/focus so it never consumes
 * chart height and is never clipped by the widget card or scroll container.
 */
export function ChartLegendPopover({ items }: ChartLegendPopoverProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const closeTimer = useRef<number | undefined>(undefined);
	const [open, setOpen] = useState(false);
	const [coords, setCoords] = useState<PopoverCoords | null>(null);

	const reposition = useCallback(() => {
		const button = buttonRef.current;
		if (!button || typeof window === 'undefined') return;

		const rect = button.getBoundingClientRect();
		const spaceBelow = window.innerHeight - rect.bottom;
		const spaceAbove = rect.top;
		const placeBelow = spaceBelow >= spaceAbove;

		setCoords({
			right: Math.max(MARGIN, window.innerWidth - rect.right),
			top: placeBelow ? rect.bottom + GAP : undefined,
			bottom: placeBelow ? undefined : window.innerHeight - rect.top + GAP,
			maxHeight: Math.max(96, (placeBelow ? spaceBelow : spaceAbove) - GAP - MARGIN),
		});
	}, []);

	const show = useCallback(() => {
		if (closeTimer.current) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = undefined;
		}
		reposition();
		setOpen(true);
	}, [reposition]);

	const scheduleHide = useCallback(() => {
		closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
	}, []);

	// Close on scroll/resize while open — the anchored position would otherwise go stale.
	useEffect(() => {
		if (!open) return;
		const close = () => setOpen(false);
		window.addEventListener('scroll', close, true);
		window.addEventListener('resize', close);
		return () => {
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
		};
	}, [open]);

	useEffect(() => () => window.clearTimeout(closeTimer.current), []);

	if (items.length === 0) {
		return null;
	}

	const label = translate('core:widget.legend');

	return (
		<>
			<button
				ref={buttonRef}
				type="button"
				aria-label={label}
				title={label}
				onMouseEnter={show}
				onMouseLeave={scheduleHide}
				onFocus={show}
				onBlur={scheduleHide}
				className="flex h-8 w-8 items-center justify-center rounded-full bg-raised text-fg-secondary shadow-soft-sm transition-colors hover:text-fg focus-visible:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
				<List className="h-4 w-4" />
			</button>

			{open &&
				coords &&
				typeof document !== 'undefined' &&
				createPortal(
					<div
						role="tooltip"
						onMouseEnter={show}
						onMouseLeave={scheduleHide}
						style={{
							position: 'fixed',
							right: coords.right,
							top: coords.top,
							bottom: coords.bottom,
							maxHeight: coords.maxHeight,
						}}
						className="z-[1000] w-max min-w-[8rem] max-w-[13rem] overflow-y-auto rounded-lg border border-border bg-raised p-2.5 shadow-soft-lg">
						<ul className="flex flex-col gap-1.5">
							{items.map((item, index) => (
								<li key={`${item.label}-${index}`} className="flex items-center gap-2">
									<span
										aria-hidden
										className="h-2.5 w-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: item.color }}
									/>
									<span className="min-w-0 truncate text-xs text-fg-secondary">{item.label}</span>
								</li>
							))}
						</ul>
					</div>,
					document.body,
				)}
		</>
	);
}
