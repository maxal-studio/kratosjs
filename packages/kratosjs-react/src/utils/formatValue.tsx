import React from 'react';

/**
 * Utility functions for formatting field values in view mode
 */

/**
 * Format a date value according to the specified format
 */
export function formatDate(value: any, format?: string): string {
	if (!value) return '-';

	try {
		const date = new Date(value);
		if (isNaN(date.getTime())) return String(value);

		if (format) {
			// Simple format support - can be extended
			const year = date.getFullYear();
			const month = String(date.getMonth() + 1).padStart(2, '0');
			const day = String(date.getDate()).padStart(2, '0');
			const hours = String(date.getHours()).padStart(2, '0');
			const minutes = String(date.getMinutes()).padStart(2, '0');
			const seconds = String(date.getSeconds()).padStart(2, '0');

			return format
				.replace('YYYY', String(year))
				.replace('MM', month)
				.replace('DD', day)
				.replace('HH', hours)
				.replace('mm', minutes)
				.replace('ss', seconds);
		}

		return date.toLocaleString();
	} catch {
		return String(value);
	}
}

/**
 * Format a number value with optional options
 */
export function formatNumber(value: any, options?: { decimals?: number; currency?: string }): string {
	if (value === null || value === undefined) return '-';

	const num = Number(value);
	if (isNaN(num)) return String(value);

	if (options?.currency) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: options.currency,
			minimumFractionDigits: options.decimals ?? 2,
			maximumFractionDigits: options.decimals ?? 2,
		}).format(num);
	}

	if (options?.decimals !== undefined) {
		return num.toFixed(options.decimals);
	}

	return num.toLocaleString();
}

/**
 * Format a boolean value
 */
export function formatBoolean(value: any): string {
	if (value === null || value === undefined) return '-';
	return value ? 'Yes' : 'No';
}

/**
 * Format a select value to display option labels
 */
export function formatSelectLabel(value: any, options?: Record<string | number, string>, isMultiple?: boolean): string {
	if (!value) return '-';

	if (isMultiple && Array.isArray(value)) {
		if (value.length === 0) return '-';
		if (!options) return value.join(', ');
		return value
			.map(v => {
				const key = String(v);
				return options[key] || key;
			})
			.join(', ');
	}

	if (!options) return String(value);
	const key = String(value);
	return options[key] || key;
}

/**
 * Format a textarea value preserving line breaks
 * Returns an array of React elements for rendering
 */
export function formatTextarea(value: any): React.ReactNode {
	if (value === null || value === undefined) return '-';
	// If is js object, return json string
	let text = value;
	if (typeof value === 'object') {
		text = JSON.stringify(value, null, 2);
	} else {
		text = String(value);
	}
	const lines = text.split('\n');
	return lines.map((line, i) => (
		<React.Fragment key={i}>
			{line}
			{i < lines.length - 1 && <br />}
		</React.Fragment>
	));
}
