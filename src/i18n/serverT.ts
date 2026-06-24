// Server-only i18n: the universal `t()` and `withLocale()`.
//
// This module imports `node:async_hooks` (for scoped locales) and the
// request-context storage, so it is exported ONLY from the main server entry
// (`src/index.ts`) and NEVER from the browser-safe `src/i18n/index.ts`.

import { AsyncLocalStorage } from 'node:async_hooks';
import { getRequestContext } from '../RequestContextStorage';
import { createI18n, type KratosI18n } from './KratosI18n';
import { coreResources } from './locales/core';

let serverI18n: KratosI18n | undefined;
let serverDefaultLocale = 'en';

// Lazy `core`-only default so `t()` is usable before `panel.start()` (scripts,
// unit tests, registration-time code) — resolves framework strings to English
// instead of returning the raw key.
let defaultI18n: KratosI18n | undefined;
function activeEngine(): KratosI18n {
	if (serverI18n) return serverI18n;
	if (!defaultI18n) defaultI18n = createI18n({ defaultLocale: 'en', resources: { core: coreResources } });
	return defaultI18n;
}

/** Scoped locale set by `withLocale()` — used for cron/queue/per-recipient code. */
const localeScope = new AsyncLocalStorage<string>();

/** Called by the Panel after it builds the merged server catalog. */
export function registerServerI18n(i18n: KratosI18n, defaultLocale: string): void {
	serverI18n = i18n;
	serverDefaultLocale = defaultLocale;
}

/** The panel's server i18n instance (undefined before `panel.start()`). */
export function getServerI18n(): KratosI18n | undefined {
	return serverI18n;
}

/**
 * Resolve the active server locale:
 * explicit → `withLocale()` scope → request context → panel default.
 */
export function resolveServerLocale(explicit?: string): string {
	return explicit ?? localeScope.getStore() ?? getRequestContext()?.activeLocale ?? serverDefaultLocale;
}

/**
 * Translate `key` to a string against the active server locale.
 *
 * - `params` are interpolation / ICU values (e.g. `{ name, count }`).
 * - `opts.locale` pins a specific locale (per-recipient emails, exports).
 *
 * Resolves the locale via {@link resolveServerLocale}. Usable anywhere on the
 * backend — resources, actions, hooks, custom routes, and (via `withLocale`)
 * cron/background jobs. Before `panel.start()` it resolves framework (`core:`)
 * strings via a lazy English default; app/plugin keys return the key until the
 * panel registers its catalogs.
 *
 * @example t('app:users.label')
 * @example t('app:emails.welcome', { name }, { locale: user.preferredLang })
 */
export function t(key: string, params?: Record<string, unknown>, opts?: { locale?: string }): string {
	const locale = resolveServerLocale(opts?.locale);
	return activeEngine().t(key, { ...(params ?? {}), locale });
}

/**
 * Run `fn` with `locale` as the active server locale for everything inside its
 * (a)sync call tree. For code with no request in scope (cron, queues) or to emit
 * content in a specific recipient's language.
 *
 * @example await withLocale('sq', async () => { logger.info(t('jobs.summary', { n })); });
 */
export function withLocale<T>(locale: string, fn: () => T): T {
	return localeScope.run(locale, fn);
}
