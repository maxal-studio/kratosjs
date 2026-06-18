/**
 * Layout helper utilities for column span, column start, and grid classes.
 *
 * IMPORTANT: every Tailwind class must appear as a full literal string here.
 * Tailwind v4 only generates utilities it can see while scanning the source —
 * template-built class names (`grid-cols-${n}`) silently produce no CSS.
 */

const GRID_COLS: Record<string, Record<number, string>> = {
	base: {
		1: 'grid-cols-1',
		2: 'grid-cols-2',
		3: 'grid-cols-3',
		4: 'grid-cols-4',
		5: 'grid-cols-5',
		6: 'grid-cols-6',
	},
	sm: {
		1: 'sm:grid-cols-1',
		2: 'sm:grid-cols-2',
		3: 'sm:grid-cols-3',
		4: 'sm:grid-cols-4',
		5: 'sm:grid-cols-5',
		6: 'sm:grid-cols-6',
	},
	md: {
		1: 'md:grid-cols-1',
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4',
		5: 'md:grid-cols-5',
		6: 'md:grid-cols-6',
	},
	lg: {
		1: 'lg:grid-cols-1',
		2: 'lg:grid-cols-2',
		3: 'lg:grid-cols-3',
		4: 'lg:grid-cols-4',
		5: 'lg:grid-cols-5',
		6: 'lg:grid-cols-6',
	},
	xl: {
		1: 'xl:grid-cols-1',
		2: 'xl:grid-cols-2',
		3: 'xl:grid-cols-3',
		4: 'xl:grid-cols-4',
		5: 'xl:grid-cols-5',
		6: 'xl:grid-cols-6',
	},
	'2xl': {
		1: '2xl:grid-cols-1',
		2: '2xl:grid-cols-2',
		3: '2xl:grid-cols-3',
		4: '2xl:grid-cols-4',
		5: '2xl:grid-cols-5',
		6: '2xl:grid-cols-6',
	},
};

const COL_SPAN: Record<string, Record<number | 'full', string>> = {
	base: {
		1: 'col-span-1',
		2: 'col-span-2',
		3: 'col-span-3',
		4: 'col-span-4',
		5: 'col-span-5',
		6: 'col-span-6',
		full: 'col-span-full',
	},
	sm: {
		1: 'sm:col-span-1',
		2: 'sm:col-span-2',
		3: 'sm:col-span-3',
		4: 'sm:col-span-4',
		5: 'sm:col-span-5',
		6: 'sm:col-span-6',
		full: 'sm:col-span-full',
	},
	md: {
		1: 'md:col-span-1',
		2: 'md:col-span-2',
		3: 'md:col-span-3',
		4: 'md:col-span-4',
		5: 'md:col-span-5',
		6: 'md:col-span-6',
		full: 'md:col-span-full',
	},
	lg: {
		1: 'lg:col-span-1',
		2: 'lg:col-span-2',
		3: 'lg:col-span-3',
		4: 'lg:col-span-4',
		5: 'lg:col-span-5',
		6: 'lg:col-span-6',
		full: 'lg:col-span-full',
	},
	xl: {
		1: 'xl:col-span-1',
		2: 'xl:col-span-2',
		3: 'xl:col-span-3',
		4: 'xl:col-span-4',
		5: 'xl:col-span-5',
		6: 'xl:col-span-6',
		full: 'xl:col-span-full',
	},
	'2xl': {
		1: '2xl:col-span-1',
		2: '2xl:col-span-2',
		3: '2xl:col-span-3',
		4: '2xl:col-span-4',
		5: '2xl:col-span-5',
		6: '2xl:col-span-6',
		full: '2xl:col-span-full',
	},
};

const COL_START: Record<string, Record<number, string>> = {
	base: {
		1: 'col-start-1',
		2: 'col-start-2',
		3: 'col-start-3',
		4: 'col-start-4',
		5: 'col-start-5',
		6: 'col-start-6',
		7: 'col-start-7',
	},
	sm: {
		1: 'sm:col-start-1',
		2: 'sm:col-start-2',
		3: 'sm:col-start-3',
		4: 'sm:col-start-4',
		5: 'sm:col-start-5',
		6: 'sm:col-start-6',
		7: 'sm:col-start-7',
	},
	md: {
		1: 'md:col-start-1',
		2: 'md:col-start-2',
		3: 'md:col-start-3',
		4: 'md:col-start-4',
		5: 'md:col-start-5',
		6: 'md:col-start-6',
		7: 'md:col-start-7',
	},
	lg: {
		1: 'lg:col-start-1',
		2: 'lg:col-start-2',
		3: 'lg:col-start-3',
		4: 'lg:col-start-4',
		5: 'lg:col-start-5',
		6: 'lg:col-start-6',
		7: 'lg:col-start-7',
	},
	xl: {
		1: 'xl:col-start-1',
		2: 'xl:col-start-2',
		3: 'xl:col-start-3',
		4: 'xl:col-start-4',
		5: 'xl:col-start-5',
		6: 'xl:col-start-6',
		7: 'xl:col-start-7',
	},
	'2xl': {
		1: '2xl:col-start-1',
		2: '2xl:col-start-2',
		3: '2xl:col-start-3',
		4: '2xl:col-start-4',
		5: '2xl:col-start-5',
		6: '2xl:col-start-6',
		7: '2xl:col-start-7',
	},
};

const BREAKPOINTS = ['sm', 'md', 'lg', 'xl', '2xl'] as const;

function spanClass(breakpoint: string, value: number | string): string | undefined {
	const key = value === 'full' ? 'full' : Number(value);
	return COL_SPAN[breakpoint]?.[key as number | 'full'];
}

/**
 * Get Tailwind CSS classes for column span and column start.
 * Supports both simple values and responsive objects.
 */
export function getColumnClasses(
	columnSpan?: number | string | Record<string, number | string>,
	columnStart?: number | Record<string, number>,
): string {
	const classes: string[] = [];

	if (columnSpan) {
		if (typeof columnSpan === 'number' || typeof columnSpan === 'string') {
			const cls = spanClass('base', columnSpan);
			if (cls) classes.push(cls);
		} else if (typeof columnSpan === 'object') {
			const span = columnSpan as Record<string, number | string>;
			if (span.default) {
				const cls = spanClass('base', span.default);
				if (cls) classes.push(cls);
			}
			for (const bp of BREAKPOINTS) {
				if (span[bp]) {
					const cls = spanClass(bp, span[bp]);
					if (cls) classes.push(cls);
				}
			}
		}
	}

	if (columnStart) {
		if (typeof columnStart === 'number') {
			const cls = COL_START.base[columnStart];
			if (cls) classes.push(cls);
		} else if (typeof columnStart === 'object') {
			const start = columnStart as Record<string, number>;
			if (start.default) {
				const cls = COL_START.base[start.default];
				if (cls) classes.push(cls);
			}
			for (const bp of BREAKPOINTS) {
				if (start[bp]) {
					const cls = COL_START[bp]?.[start[bp]];
					if (cls) classes.push(cls);
				}
			}
		}
	}

	return classes.join(' ');
}

/**
 * Get Tailwind CSS grid classes based on columns configuration.
 * Supports both simple numbers (applied from lg up) and responsive objects.
 */
export function getGridClasses(columns?: number | Record<string, number>, gapX: string = 'gap-x-4'): string {
	if (!columns || columns === 1) {
		return `grid grid-cols-1 ${gapX}`;
	}

	if (typeof columns === 'number') {
		const cls = GRID_COLS.lg[columns];
		return cls ? `grid grid-cols-1 ${cls} ${gapX}` : `grid grid-cols-1 ${gapX}`;
	}

	const classes = ['grid', gapX];
	const cols = columns as Record<string, number>;

	classes.push(cols.default ? GRID_COLS.base[cols.default] || 'grid-cols-1' : 'grid-cols-1');

	for (const bp of BREAKPOINTS) {
		if (cols[bp]) {
			const cls = GRID_COLS[bp]?.[cols[bp]];
			if (cls) classes.push(cls);
		}
	}

	return classes.join(' ');
}

/** Vertical rhythm for stacked form fields (single column) or grid rows (multi-column). */
export function getFieldLayoutClasses(columns?: number | Record<string, number>): string {
	if (!columns || columns === 1) {
		return 'flex flex-col gap-4';
	}
	return `${getGridClasses(columns)} gap-y-4`;
}
