// Thin wrapper around an isolated i18next instance.
//
// This file is **browser-safe** — it must not import any `node:*` module, since
// it ships to the React package via `dist/i18n`. The server-only concerns
// (AsyncLocalStorage active-locale, request resolution) live in `serverT.ts`,
// which is exported only from the main server entry.

import i18next, { type i18n as I18nextInstance } from 'i18next';
import ICU from 'i18next-icu';
import type { Catalog, Direction, I18nConfig, NamespaceResources, TranslateOptions, Translator } from './types';

/** Default namespace used when a key has no `ns:` prefix. */
const DEFAULT_NS = 'app';

/**
 * Wraps one i18next instance and exposes a small, stable API. Concurrency-safe
 * for a shared server instance: per-call locale is passed via the options object
 * (`lng`), never via `changeLanguage`, so concurrent requests don't interfere.
 */
export class KratosI18n implements Translator {
	private readonly instance: I18nextInstance;
	private readonly directions: Record<string, Direction>;
	private readonly defaultLocale: string;

	constructor(instance: I18nextInstance, opts: { defaultLocale: string; directions?: Record<string, Direction> }) {
		this.instance = instance;
		this.defaultLocale = opts.defaultLocale;
		this.directions = opts.directions ?? {};
	}

	/**
	 * Translate `key` (optionally namespaced as `ns:dotted.key`), returning a
	 * string. Pass `{ locale }` to resolve against a specific locale; otherwise the
	 * instance's default locale is used. Interpolation/ICU params are passed through.
	 */
	t(key: string, params?: TranslateOptions): string {
		const { locale, ...rest } = params ?? {};
		const lng = locale ?? this.defaultLocale;
		// lng-in-options keeps the shared instance concurrency-safe (no changeLanguage).
		return this.instance.t(key, { lng, ...rest }) as string;
	}

	/** Merge a catalog into a namespace for a locale (deep merge, overwrites existing keys). */
	addBundle(namespace: string, locale: string, catalog: Catalog): void {
		this.instance.addResourceBundle(locale, namespace, catalog, true, true);
	}

	/** Merge a `{ [locale]: catalog }` map into a namespace. */
	addNamespace(namespace: string, resources: NamespaceResources): void {
		for (const [locale, catalog] of Object.entries(resources)) {
			this.addBundle(namespace, locale, catalog);
		}
	}

	/** Text direction for a locale (explicit override → i18next inference → 'ltr'). */
	getDir(locale?: string): Direction {
		const lng = locale ?? this.defaultLocale;
		return this.directions[lng] ?? (this.instance.dir(lng) as Direction) ?? 'ltr';
	}

	/** The list of supported locales. */
	getLocales(): string[] {
		const supported = this.instance.options.supportedLngs;
		if (Array.isArray(supported)) {
			return supported.filter(l => l !== 'cimode');
		}
		return [this.defaultLocale];
	}

	/** True when `locale` is one of the supported locales. */
	hasLocale(locale: string): boolean {
		return this.getLocales().includes(locale);
	}

	getDefaultLocale(): string {
		return this.defaultLocale;
	}

	/** Escape hatch for advanced use. */
	getInstance(): I18nextInstance {
		return this.instance;
	}
}

/**
 * Build a `KratosI18n` from a config. Synchronous: i18next initializes
 * immediately with in-memory resources and no async backend.
 */
export function createI18n(config: I18nConfig = {}): KratosI18n {
	const resources = config.resources ?? {};
	const namespaces = new Set<string>(Object.keys(resources));
	const defaultNamespace = config.defaultNamespace ?? DEFAULT_NS;
	namespaces.add(defaultNamespace);

	// Locales: an explicit `config.locales` is authoritative (so a panel that wants
	// only `en` isn't forced to expose `sq` just because the core chrome ships it).
	// Otherwise discover the supported locales from the registered resources.
	const localeSet = new Set<string>(config.locales ?? []);
	if (!config.locales || config.locales.length === 0) {
		for (const nsResources of Object.values(resources)) {
			for (const locale of Object.keys(nsResources)) localeSet.add(locale);
		}
	}
	const locales = localeSet.size > 0 ? [...localeSet] : ['en'];
	const defaultLocale = config.defaultLocale ?? locales[0];
	const fallbackLocale = config.fallbackLocale ?? defaultLocale;

	// Convert our `namespace -> locale -> catalog` into i18next's `locale -> namespace -> catalog`.
	const i18nextResources: Record<string, Record<string, Catalog>> = {};
	for (const [namespace, nsResources] of Object.entries(resources)) {
		for (const [locale, catalog] of Object.entries(nsResources)) {
			(i18nextResources[locale] ??= {})[namespace] = catalog;
		}
	}

	const instance = i18next.createInstance();
	instance.use(ICU as never);
	// Synchronous init — in-memory resources, no async backend (i18next v26 default).
	void instance.init({
		lng: defaultLocale,
		fallbackLng: fallbackLocale,
		supportedLngs: locales,
		ns: [...namespaces],
		defaultNS: defaultNamespace,
		resources: i18nextResources,
		// Keys are flat dotted strings (`users.fields.email`); `ns:` selects a namespace.
		keySeparator: false,
		nsSeparator: ':',
		interpolation: { escapeValue: false },
		returnNull: false,
		returnEmptyString: false,
		// i18next-icu: disable memoization so warm catalog overwrites never serve a stale compile.
		i18nFormat: { memoize: false, memoizeFallback: false },
	} as never);

	return new KratosI18n(instance, { defaultLocale, directions: config.directions });
}
