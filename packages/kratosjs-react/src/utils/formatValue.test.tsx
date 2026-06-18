import { describe, expect, it } from 'vitest';
import { formatDate, formatNumber, formatBoolean, formatSelectLabel } from './formatValue';

describe('formatDate', () => {
	it('returns "-" for empty values', () => {
		expect(formatDate(null)).toBe('-');
		expect(formatDate('')).toBe('-');
	});

	it('returns the raw value for invalid dates', () => {
		expect(formatDate('not-a-date')).toBe('not-a-date');
	});

	it('applies YYYY-MM-DD style format tokens', () => {
		expect(formatDate('2026-01-15T10:30:45', 'YYYY-MM-DD')).toBe('2026-01-15');
		expect(formatDate('2026-01-15T10:30:45', 'DD/MM/YYYY HH:mm')).toBe('15/01/2026 10:30');
	});
});

describe('formatNumber', () => {
	it('returns "-" for null/undefined', () => {
		expect(formatNumber(null)).toBe('-');
		expect(formatNumber(undefined)).toBe('-');
	});

	it('returns the raw value as string for non-numbers', () => {
		expect(formatNumber('abc')).toBe('abc');
	});

	it('formats currency', () => {
		expect(formatNumber(1234.5, { currency: 'USD' })).toBe('$1,234.50');
	});

	it('applies fixed decimals', () => {
		expect(formatNumber(3.14159, { decimals: 2 })).toBe('3.14');
	});

	it('falls back to locale formatting', () => {
		expect(formatNumber(1000000)).toBe((1000000).toLocaleString());
	});
});

describe('formatBoolean', () => {
	it('maps booleans to Yes/No and empty to "-"', () => {
		expect(formatBoolean(true)).toBe('Yes');
		expect(formatBoolean(false)).toBe('No');
		expect(formatBoolean(null)).toBe('-');
	});
});

describe('formatSelectLabel', () => {
	it('returns "-" for empty values', () => {
		expect(formatSelectLabel(null)).toBe('-');
	});

	it('maps a single value through options', () => {
		expect(formatSelectLabel('a', { a: 'Alpha' })).toBe('Alpha');
		expect(formatSelectLabel('missing', { a: 'Alpha' })).toBe('missing');
	});

	it('joins multiple values with labels', () => {
		expect(formatSelectLabel(['a', 'b'], { a: 'Alpha', b: 'Beta' }, true)).toBe('Alpha, Beta');
		expect(formatSelectLabel([], { a: 'Alpha' }, true)).toBe('-');
	});
});
