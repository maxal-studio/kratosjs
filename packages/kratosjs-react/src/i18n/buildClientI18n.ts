// Build the client KratosI18n from the server-injected config + optional overrides.
//
// The backend is the single source of truth: it injects the plugin + app catalogs
// (and the locale config) into the admin HTML, and the client consumes them here.
//
// Catalog precedence (later wins): package chrome (`core`) → server-injected
// resources (plugin + app namespaces) → optional mount-time overrides. App override
// catalogs may target any namespace via a `ns:` key prefix (e.g. `core:common.save`
// overrides a built-in chrome string); unprefixed keys go to the `app` namespace.

import {
	createI18n,
	type KratosI18n,
	type I18nResources,
	type Catalog,
	type Direction,
} from '@maxal_studio/kratosjs/dist/i18n';
import { clientCoreResources } from './locales/core';

/** Per-locale catalog map, e.g. `{ en: {...}, sq: {...} }`. */
export type ClientTranslations = Record<string, Catalog>;

export interface ClientI18nConfig {
	defaultLocale?: string;
	fallbackLocale?: string;
	locales?: string[];
	/** Text direction per locale, forwarded from the server for app-added RTL locales. */
	directions?: Record<string, Direction>;
	/**
	 * Server-injected catalogs (`namespace -> locale -> catalog`) for the plugin and
	 * app namespaces. Populated from `window.__VALAJS_I18N__`.
	 */
	resources?: I18nResources;
	/**
	 * Optional mount-time override catalogs by locale. Keys may be `ns:key`
	 * (defaults to the `app` namespace) — mainly to override built-in `core:` chrome.
	 */
	translations?: ClientTranslations;
}

function mergeInto(target: I18nResources, namespace: string, locale: string, catalog: Catalog): void {
	const ns = (target[namespace] ??= {});
	ns[locale] = { ...(ns[locale] ?? {}), ...catalog };
}

/**
 * Assemble the `namespace -> locale -> catalog` resources for the client engine.
 */
export function buildClientResources(config: ClientI18nConfig = {}): I18nResources {
	const resources: I18nResources = {};

	// 1. Package chrome (core namespace) — bundled with the React package.
	for (const [locale, catalog] of Object.entries(clientCoreResources)) {
		mergeInto(resources, 'core', locale, catalog);
	}

	// 2. Server-injected catalogs (plugin + app namespaces, already in the right
	//    app-wins precedence from the backend merge).
	for (const [namespace, byLocale] of Object.entries(config.resources ?? {})) {
		for (const [locale, catalog] of Object.entries(byLocale)) {
			mergeInto(resources, namespace, locale, catalog);
		}
	}

	// 3. Mount-time overrides (last → win). A `ns:` prefix routes the key to that
	//    namespace, so the app can override core/plugin strings; otherwise `app`.
	for (const [locale, catalog] of Object.entries(config.translations ?? {})) {
		for (const [key, value] of Object.entries(catalog)) {
			const idx = key.indexOf(':');
			const namespace = idx === -1 ? 'app' : key.slice(0, idx);
			const realKey = idx === -1 ? key : key.slice(idx + 1);
			mergeInto(resources, namespace, locale, { [realKey]: value });
		}
	}

	return resources;
}

/** Locales discovered across all registered catalogs (plus any declared). */
export function discoverClientLocales(resources: I18nResources, declared?: string[]): string[] {
	if (declared && declared.length > 0) return declared;
	const set = new Set<string>();
	for (const byLocale of Object.values(resources)) {
		for (const locale of Object.keys(byLocale)) set.add(locale);
	}
	return set.size > 0 ? [...set] : ['en'];
}

/** Create the client engine from the server-injected config + optional overrides. */
export function buildClientI18n(config: ClientI18nConfig = {}): KratosI18n {
	const resources = buildClientResources(config);
	const locales = discoverClientLocales(resources, config.locales);
	const defaultLocale = config.defaultLocale ?? (locales.includes('en') ? 'en' : locales[0]);
	return createI18n({
		locales,
		defaultLocale,
		fallbackLocale: config.fallbackLocale ?? defaultLocale,
		directions: config.directions,
		resources,
	});
}
