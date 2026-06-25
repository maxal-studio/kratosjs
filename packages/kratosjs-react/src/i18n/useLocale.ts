import { useI18nContext } from './I18nProvider';

/**
 * Read and change the active UI locale.
 *
 * @example
 * const { locale, setLocale, locales } = useLocale();
 */
export function useLocale(): {
	locale: string;
	setLocale: (locale: string) => void;
	locales: string[];
} {
	const { locale, setLocale, locales } = useI18nContext();
	return { locale, setLocale, locales };
}
