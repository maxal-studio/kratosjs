// Module-level mirror of the active client locale + engine.
//
// Lets non-hook utilities (formatValue, tableFormatters) localize via `translate`
// / `getActiveLocale` without threading a locale argument through every call.
// The I18nProvider keeps this in sync with React state on every locale change.

import type { KratosI18n } from '@maxal_studio/kratosjs/dist/i18n';
import { buildClientI18n } from './buildClientI18n';

let activeEngine: KratosI18n | null = null;
let activeLocale = 'en';
let defaultEngine: KratosI18n | null = null;

/** The active engine, or a lazily-built `core`-only default (no provider mounted). */
function engine(): KratosI18n {
	if (activeEngine) return activeEngine;
	if (!defaultEngine) defaultEngine = buildClientI18n();
	return defaultEngine;
}

/** Update the active engine + locale (called by I18nProvider). */
export function setActiveI18n(next: KratosI18n, locale: string): void {
	activeEngine = next;
	activeLocale = locale;
}

/** The active locale, e.g. for `Intl` formatters. Defaults to `'en'`. */
export function getActiveLocale(): string {
	return activeLocale;
}

/**
 * Translate `key` against the active locale. Falls back to a `core`-only default
 * engine when no provider has mounted (so isolated tests + pre-mount utilities
 * still resolve chrome). Prefer `useTranslation` inside components.
 */
export function translate(key: string, params?: Record<string, unknown>): string {
	return engine().t(key, { locale: activeLocale, ...params });
}
