import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { KratosI18n } from '@maxal_studio/kratosjs/dist/i18n';
import { buildClientI18n, type ClientI18nConfig } from './buildClientI18n';
import { setActiveI18n } from './activeLocale';

const STORAGE_KEY = 'kratosjs-locale';

export interface I18nContextValue {
	/** The underlying engine (escape hatch). */
	engine: KratosI18n;
	/** Active UI locale. */
	locale: string;
	/** Switch the active locale (persists + updates `<html lang/dir>` + re-fetches). */
	setLocale: (locale: string) => void;
	/** Supported locales. */
	locales: string[];
	/** Text direction of the active locale. */
	dir: 'ltr' | 'rtl';
	/** Translate a (possibly `ns:`-prefixed) key against the active locale. */
	t: (key: string, params?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

// Lazy default engine so components used outside a provider (isolated tests, the
// pre-mount window) still resolve `core` chrome instead of crashing.
let defaultEngine: KratosI18n | null = null;
function getDefaultEngine(): KratosI18n {
	if (!defaultEngine) defaultEngine = buildClientI18n();
	return defaultEngine;
}

function resolveInitialLocale(engine: KratosI18n, configDefault?: string): string {
	const locales = engine.getLocales();
	const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
	if (stored && locales.includes(stored)) return stored;
	if (configDefault && locales.includes(configDefault)) return configDefault;
	const nav = typeof navigator !== 'undefined' ? navigator.language : '';
	if (nav) {
		if (locales.includes(nav)) return nav;
		const base = nav.split('-')[0];
		if (locales.includes(base)) return base;
	}
	return engine.getDefaultLocale();
}

export interface I18nProviderProps {
	config?: ClientI18nConfig;
	children: React.ReactNode;
}

export function I18nProvider({ config, children }: I18nProviderProps) {
	const engine = useMemo(() => buildClientI18n(config), [config]);
	const [locale, setLocaleState] = useState(() => resolveInitialLocale(engine, config?.defaultLocale));

	// Set the module mirror SYNCHRONOUSLY during render (not only in the effect) so
	// non-hook `translate()` calls in children resolve the correct locale on the
	// very first paint — important for a persisted non-default locale.
	useMemo(() => setActiveI18n(engine, locale), [engine, locale]);

	// Keep the <html> attributes + storage in sync with the locale.
	useEffect(() => {
		setActiveI18n(engine, locale);
		if (typeof document !== 'undefined') {
			document.documentElement.lang = locale;
			document.documentElement.dir = engine.getDir(locale);
		}
		if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, locale);
	}, [engine, locale]);

	const setLocale = useCallback(
		(next: string) => {
			if (next === locale) return;
			// Persist + apply the document attributes immediately, then do a full
			// refresh so EVERY view — metadata, already-open table/form schemas, and
			// server-rendered labels — re-fetches and re-renders in the new locale.
			// (Schemas are cached per-mount, so a targeted re-fetch would miss them.)
			if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next);
			if (typeof document !== 'undefined') {
				document.documentElement.lang = next;
				document.documentElement.dir = engine.getDir(next);
			}
			try {
				if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
					window.location.reload();
					return;
				}
			} catch {
				// jsdom/SSR: reload isn't implemented — fall through to in-place update.
			}
			setLocaleState(next);
		},
		[locale, engine],
	);

	const value = useMemo<I18nContextValue>(
		() => ({
			engine,
			locale,
			setLocale,
			locales: engine.getLocales(),
			dir: engine.getDir(locale),
			t: (key, params) => engine.t(key, { locale, ...params }),
		}),
		[engine, locale, setLocale],
	);

	return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Read the i18n context. Degrades gracefully to a default `core`-only engine when
 * no `<I18nProvider>` is mounted (so isolated component tests don't all need wrapping).
 */
export function useI18nContext(): I18nContextValue {
	const ctx = useContext(I18nContext);
	if (ctx) return ctx;
	const engine = getDefaultEngine();
	const locale = engine.getDefaultLocale();
	return {
		engine,
		locale,
		setLocale: () => {},
		locales: engine.getLocales(),
		dir: engine.getDir(locale),
		t: (key, params) => engine.t(key, { locale, ...params }),
	};
}
