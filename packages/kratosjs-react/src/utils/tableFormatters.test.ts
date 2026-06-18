import { describe, expect, it } from 'vitest';
import { formatValue, stripHtml } from './tableFormatters';

const column = (overrides: Record<string, unknown> = {}) => overrides as any;

describe('formatValue', () => {
	it('returns null for null/undefined values', () => {
		expect(formatValue(null, column())).toBeNull();
		expect(formatValue(undefined, column())).toBeNull();
	});

	it('formats dates with dateFormat', () => {
		const value = '2026-01-15T10:30:00';
		expect(formatValue(value, column({ dateFormat: 'date' }))).toBe(new Date(value).toLocaleDateString());
		expect(formatValue(value, column({ dateFormat: 'dateTime' }))).toBe(new Date(value).toLocaleString());
	});

	it('returns the raw value for invalid dates', () => {
		expect(formatValue('nope', column({ dateFormat: 'date' }))).toBe('nope');
	});

	it('formats relative time for past dates', () => {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
		expect(formatValue(twoHoursAgo, column({ dateFormat: 'since' }))).toBe('2 hours ago');
	});

	it('formats money', () => {
		expect(formatValue(12.5, column({ moneyFormat: 'USD' }))).toBe('$12.50');
		expect(formatValue('12.5', column({ moneyFormat: 'EUR' }))).toBe('€12.50');
		expect(formatValue('abc', column({ moneyFormat: 'USD' }))).toBe('abc');
	});

	it('strips HTML by default', () => {
		expect(formatValue('<b>bold</b> text', column())).toBe('bold text');
	});

	it('keeps HTML when stripHtml is false', () => {
		expect(formatValue('<b>bold</b>', column({ stripHtml: false }))).toBe('<b>bold</b>');
	});

	it('strips HTML from array items', () => {
		expect(formatValue(['<i>a</i>', 2], column())).toEqual(['a', 2]);
	});
});

describe('stripHtml', () => {
	it('removes tags and keeps text', () => {
		expect(stripHtml('<div><p>hello</p> <span>world</span></div>')).toBe('hello world');
	});

	it('passes through non-strings', () => {
		expect(stripHtml(42 as unknown as string)).toBe(42);
	});
});
