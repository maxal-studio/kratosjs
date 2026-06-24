// Build the client KratosI18n from mount options + plugin manifests.
//
// Catalog precedence (later wins): package chrome (`core`) → plugin namespaces →
// app. App catalogs may target any namespace via a `ns:` key prefix (e.g.
// `core:common.save` overrides a built-in chrome string); unprefixed app keys go
// to the `app` namespace.

import { createI18n, type KratosI18n, type I18nResources, type Catalog } from '@maxal_studio/kratosjs/dist/i18n';
import { clientCoreResources } from './locales/core';
import type { KratosPluginClient } from '../plugin';

/** Per-locale catalog map, e.g. `{ en: {...}, sq: {...} }`. */
export type ClientTranslations = Record<string, Catalog>;

export interface ClientI18nConfig {
	defaultLocale?: string;
	fallbackLocale?: string;
	locales?: string[];
	/** App catalogs by locale. Keys may be `ns:key` (defaults to the `app` namespace). */
	translations?: ClientTranslations;
}

function mergeInto(target: I18nResources, namespace: string, locale: string, catalog: Catalog): void {
	const ns = (target[namespace] ??= {});
	ns[locale] = { ...(ns[locale] ?? {}), ...catalog };
}

/**
 * Assemble the `namespace -> locale -> catalog` resources for the client engine.
 */
export function buildClientResources(config: ClientI18nConfig = {}, plugins: KratosPluginClient[] = []): I18nResources {
	const resources: I18nResources = {};

	// 1. Package chrome (core namespace).
	for (const [locale, catalog] of Object.entries(clientCoreResources)) {
		mergeInto(resources, 'core', locale, catalog);
	}

	// 2. Plugin catalogs (namespaced by plugin name; bare keys).
	for (const plugin of plugins) {
		if (!plugin.translations || !plugin.name) continue;
		for (const [locale, catalog] of Object.entries(plugin.translations)) {
			mergeInto(resources, plugin.name, locale, catalog);
		}
	}

	// 3. App catalogs (last → win). A `ns:` prefix routes the key to that namespace,
	//    so the app can override core/plugin strings; otherwise it lands in `app`.
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

/** Create the client engine from config + plugins. */
export function buildClientI18n(config: ClientI18nConfig = {}, plugins: KratosPluginClient[] = []): KratosI18n {
	const resources = buildClientResources(config, plugins);
	const locales = discoverClientLocales(resources, config.locales);
	const defaultLocale = config.defaultLocale ?? (locales.includes('en') ? 'en' : locales[0]);
	return createI18n({
		locales,
		defaultLocale,
		fallbackLocale: config.fallbackLocale ?? defaultLocale,
		resources,
	});
}
