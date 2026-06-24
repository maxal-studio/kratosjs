import { SerializedColumn } from '@maxal_studio/kratosjs';
import { executeSerializedFunction } from '../runtime/serializedFunctions';
import { getActiveLocale } from '../i18n/activeLocale';

/**
 * Format a value based on column configuration
 * @param value - The cell value
 * @param column - The column configuration
 * @param row - The entire row data (optional, used by formatStateUsing function)
 */
export function formatValue(value: any, column: SerializedColumn, row?: Record<string, any>): any {
	// Only apply placeholder for null/undefined when there's no formatter
	if (value === null || value === undefined) {
		return null;
	}

	// Date formatting
	if (column.dateFormat) {
		const date = new Date(value);
		if (isNaN(date.getTime())) return value;

		const locale = getActiveLocale();
		switch (column.dateFormat) {
			case 'date':
				return date.toLocaleDateString(locale);
			case 'dateTime':
				return date.toLocaleString(locale);
			case 'time':
				return date.toLocaleTimeString(locale);
			case 'since':
			case 'until':
				return getRelativeTime(date);
			default:
				return date.toLocaleDateString(locale);
		}
	}

	// Money formatting
	if (column.moneyFormat) {
		const numValue = typeof value === 'number' ? value : parseFloat(value);
		if (isNaN(numValue)) return value;

		return new Intl.NumberFormat(getActiveLocale(), {
			style: 'currency',
			currency: column.moneyFormat || 'USD',
		}).format(numValue);
	}

	// Strip HTML by default; only skip when stripHtml is explicitly false.
	// column.stripHtml is true (default), false (explicit), or undefined (treated as true).
	const shouldStripHtml = column.stripHtml !== false;

	if (shouldStripHtml) {
		if (typeof value === 'string') {
			return stripHtml(value);
		}
		// Handle arrays - strip HTML from each string item
		if (Array.isArray(value)) {
			return value.map(item => (typeof item === 'string' ? stripHtml(item) : item));
		}
	}

	return value;
}

/**
 * Strip HTML tags from a string
 * @param html - The HTML string to strip
 * @returns Plain text with HTML tags removed
 */
export function stripHtml(html: string): string {
	if (typeof html !== 'string') {
		return html;
	}

	// Create a temporary DOM element to parse HTML
	const tmp = document.createElement('div');
	tmp.innerHTML = html;
	return tmp.textContent || tmp.innerText || '';
}

/**
 * Locale-aware relative time (e.g. "2 hours ago", "in 3 days"), using the active
 * locale via `Intl.RelativeTimeFormat`. The true signed delta (date − now) drives
 * direction, so past dates read "ago" and future dates read "in …".
 */
function getRelativeTime(date: Date): string {
	const deltaSec = Math.round((date.getTime() - Date.now()) / 1000);
	const abs = Math.abs(deltaSec);
	const rtf = new Intl.RelativeTimeFormat(getActiveLocale(), { numeric: 'auto' });

	const units: [Intl.RelativeTimeFormatUnit, number][] = [
		['year', 31536000],
		['month', 2592000],
		['week', 604800],
		['day', 86400],
		['hour', 3600],
		['minute', 60],
	];
	for (const [unit, secs] of units) {
		if (abs >= secs) return rtf.format(Math.round(deltaSec / secs), unit);
	}
	return rtf.format(0, 'second');
}
