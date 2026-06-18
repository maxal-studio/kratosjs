import type { CSSProperties } from 'react';

interface ColumnMediaSizeOptions {
	width?: number | string;
	height?: number | string;
	ratio?: string;
	circular?: boolean;
}

/**
 * Dimensions for image/media/video column thumbnails.
 * Circular columns always render as a true square (1:1) so rounded-full clips a circle.
 */
export function getColumnMediaDimensions(
	column: ColumnMediaSizeOptions,
	defaultSize: number | string = 40,
): CSSProperties {
	if (column.circular) {
		const raw = column.width ?? column.height ?? defaultSize;
		const size = typeof raw === 'number' ? `${raw}px` : raw;
		return {
			width: size,
			height: size,
			minWidth: size,
			minHeight: size,
			flexShrink: 0,
			aspectRatio: '1 / 1',
		};
	}

	const ratio = column.ratio || '16/9';

	if (column.width) {
		const w = typeof column.width === 'number' ? `${column.width}px` : column.width;
		return { width: w, minWidth: w, flexShrink: 0, aspectRatio: ratio };
	}

	if (column.height) {
		const h = typeof column.height === 'number' ? `${column.height}px` : column.height;
		return { height: h, minHeight: h, flexShrink: 0, aspectRatio: ratio };
	}

	const w = typeof defaultSize === 'number' ? `${defaultSize}px` : defaultSize;
	return { width: w, minWidth: w, flexShrink: 0, aspectRatio: ratio };
}
