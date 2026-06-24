// Shared, isomorphic i18n type definitions.
//
// These types describe the translation layer used by BOTH the Node backend
// (server `t()`) and the React frontend (`useTranslation`). The engine is a thin
// wrapper over i18next so the public surface here stays small and swappable.

/** A catalog of translation strings for one namespace + locale (flat dotted keys). */
export type Catalog = Record<string, string>;

/** `{ [locale]: Catalog }` for a single namespace, e.g. `{ en: {...}, sq: {...} }`. */
export type NamespaceResources = Record<string, Catalog>;

/** `{ [namespace]: { [locale]: Catalog } }`. */
export type I18nResources = Record<string, NamespaceResources>;

/** Text direction for a locale. */
export type Direction = 'ltr' | 'rtl';

/**
 * Configuration for building an i18n instance. Shared shape for both the server
 * (`panel.i18n({...})`) and the client (`mountAdminPanel({ i18n: {...} })`).
 */
export interface I18nConfig {
	/** The locales this instance supports, e.g. `['en', 'sq']`. */
	locales?: string[];
	/** The default active locale. Defaults to the first registered locale or `'en'`. */
	defaultLocale?: string;
	/** Locale(s) to fall back to for missing keys. Defaults to `defaultLocale`. */
	fallbackLocale?: string | string[];
	/** Initial catalogs, keyed by `namespace -> locale -> catalog`. */
	resources?: I18nResources;
	/** The default namespace used when a key has no `ns:` prefix. Defaults to `'app'`. */
	defaultNamespace?: string;
	/** Explicit text-direction overrides, keyed by locale (otherwise inferred). */
	directions?: Record<string, Direction>;
}

/** Options accepted by `t()` — interpolation params plus an optional locale override. */
export interface TranslateOptions {
	/** Resolve against this locale instead of the active one. */
	locale?: string;
	/** Interpolation / ICU params (e.g. `{ name, count }`). */
	[param: string]: unknown;
}

/** The minimal translate contract consumed across the codebase. */
export interface Translator {
	t(key: string, params?: TranslateOptions): string;
}
