import { useMemo } from 'react';
import { useI18nContext } from './I18nProvider';

/**
 * Locale-aware `Intl` formatters bound to the active locale. Re-created when the
 * locale changes so dates, numbers, currency, and relative times all localize.
 *
 * @example
 * const fmt = useFormatter();
 * fmt.date(row.createdAt);          // 6/24/2026  /  24.6.2026
 * fmt.currency(1234.5, 'EUR');      // €1,234.50
 * fmt.relativeTime(-3, 'day');      // 3 days ago
 */
export function useFormatter() {
	const { locale } = useI18nContext();

	return useMemo(
		() => ({
			locale,
			date(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
				return new Intl.DateTimeFormat(locale, options).format(new Date(value));
			},
			dateTime(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
				return new Intl.DateTimeFormat(locale, {
					dateStyle: 'medium',
					timeStyle: 'short',
					...options,
				}).format(new Date(value));
			},
			number(value: number, options?: Intl.NumberFormatOptions): string {
				return new Intl.NumberFormat(locale, options).format(value);
			},
			currency(value: number, currency = 'USD', options?: Intl.NumberFormatOptions): string {
				return new Intl.NumberFormat(locale, { style: 'currency', currency, ...options }).format(value);
			},
			relativeTime(value: number, unit: Intl.RelativeTimeFormatUnit): string {
				return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(value, unit);
			},
		}),
		[locale],
	);
}
