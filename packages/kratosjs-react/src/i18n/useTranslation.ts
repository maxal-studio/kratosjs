import { useI18nContext } from './I18nProvider';

/**
 * Access the active-locale translator inside a component.
 *
 * @example
 * const { t, locale, dir } = useTranslation();
 * return <button>{t('core:common.save')}</button>;
 */
export function useTranslation(): {
	t: (key: string, params?: Record<string, unknown>) => string;
	locale: string;
	dir: 'ltr' | 'rtl';
} {
	const { t, locale, dir } = useI18nContext();
	return { t, locale, dir };
}
