import { useI18nContext } from './I18nProvider';

/** Human label for a locale code, in the locale's own language (falls back to the code). */
function localeLabel(code: string): string {
	try {
		const dn = new Intl.DisplayNames([code], { type: 'language' });
		const name = dn.of(code);
		if (name) return name.charAt(0).toUpperCase() + name.slice(1);
	} catch {
		// Intl.DisplayNames unavailable — fall through.
	}
	return code;
}

export interface LocaleSwitcherProps {
	className?: string;
	/** Accessible label (defaults to the translated `core:panel.language`). */
	'aria-label'?: string;
}

/**
 * Native `<select>` locale switcher. Renders nothing when the panel has a single
 * locale. Used in the Header account menu and on the login screen.
 */
export function LocaleSwitcher({ className, ...rest }: LocaleSwitcherProps) {
	const { locale, setLocale, locales, t } = useI18nContext();
	if (locales.length <= 1) return null;

	return (
		<select
			value={locale}
			onChange={e => setLocale(e.target.value)}
			aria-label={rest['aria-label'] ?? t('core:panel.language')}
			className={
				className ??
				'k-input text-sm py-1.5 px-3 pr-8 rounded-md border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none bg-no-repeat bg-right'
			}
			style={{
				backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
				backgroundPosition: 'right 0.5rem center',
				backgroundSize: '1.5em 1.5em',
			}}>
			{locales.map(code => (
				<option key={code} value={code}>
					{localeLabel(code)}
				</option>
			))}
		</select>
	);
}
