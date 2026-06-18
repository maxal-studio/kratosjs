import { SerializedColumn } from '@maxal_studio/kratosjs';
import { executeSerializedFunction } from '../runtime/serializedFunctions';

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

		switch (column.dateFormat) {
			case 'date':
				return date.toLocaleDateString();
			case 'dateTime':
				return date.toLocaleString();
			case 'time':
				return date.toLocaleTimeString();
			case 'since':
				return getRelativeTime(date);
			case 'until':
				return getRelativeTime(date, true);
			default:
				return date.toLocaleDateString();
		}
	}

	// Money formatting
	if (column.moneyFormat) {
		const numValue = typeof value === 'number' ? value : parseFloat(value);
		if (isNaN(numValue)) return value;

		return new Intl.NumberFormat('en-US', {
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
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
function getRelativeTime(date: Date, future: boolean = false): string {
	const now = new Date();
	const diffMs = future ? date.getTime() - now.getTime() : now.getTime() - date.getTime();
	const diffSec = Math.floor(diffMs / 1000);
	const diffMin = Math.floor(diffSec / 60);
	const diffHour = Math.floor(diffMin / 60);
	const diffDay = Math.floor(diffHour / 24);
	const diffWeek = Math.floor(diffDay / 7);
	const diffMonth = Math.floor(diffDay / 30);
	const diffYear = Math.floor(diffDay / 365);

	const prefix = future ? 'in ' : '';
	const suffix = future ? '' : ' ago';

	if (diffSec < 60) return `${prefix}just now`;
	if (diffMin < 60) return `${prefix}${diffMin} minute${diffMin > 1 ? 's' : ''}${suffix}`;
	if (diffHour < 24) return `${prefix}${diffHour} hour${diffHour > 1 ? 's' : ''}${suffix}`;
	if (diffDay < 7) return `${prefix}${diffDay} day${diffDay > 1 ? 's' : ''}${suffix}`;
	if (diffWeek < 4) return `${prefix}${diffWeek} week${diffWeek > 1 ? 's' : ''}${suffix}`;
	if (diffMonth < 12) return `${prefix}${diffMonth} month${diffMonth > 1 ? 's' : ''}${suffix}`;
	return `${prefix}${diffYear} year${diffYear > 1 ? 's' : ''}${suffix}`;
}
