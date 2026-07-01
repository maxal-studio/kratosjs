import { describe, expect, it, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, renderHook, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from './I18nProvider';
import { useTranslation } from './useTranslation';
import { useLocale } from './useLocale';
import { useFormatter } from './useFormatter';
import { LocaleSwitcher } from './LocaleSwitcher';
import { buildClientResources, buildClientI18n } from './buildClientI18n';

const config = {
	defaultLocale: 'en',
	translations: {
		en: { 'home.title': 'Home', 'core:common.save': 'Save it' },
		sq: { 'home.title': 'Ballina', 'core:common.save': 'Ruaje' },
	},
};

function wrapper({ children }: { children: React.ReactNode }) {
	return <I18nProvider config={config}>{children}</I18nProvider>;
}

beforeEach(() => localStorage.clear());

describe('buildClientResources', () => {
	it('routes app keys: bare → app namespace, ns: prefix → that namespace', () => {
		const res = buildClientResources(config);
		expect(res.app.en['home.title']).toBe('Home');
		// `core:common.save` overrides the package chrome default.
		expect(res.core.en['common.save']).toBe('Save it');
		// Built-in chrome still present for non-overridden keys.
		expect(res.core.en['common.cancel']).toBe('Cancel');
	});

	it('merges server-injected resources (plugin + app namespaces)', () => {
		const res = buildClientResources({
			resources: {
				twofa: { en: { title: 'Verify' } },
				app: { en: { 'users.label': 'Users' } },
			},
		});
		expect(res.twofa.en['title']).toBe('Verify');
		expect(res.app.en['users.label']).toBe('Users');
		// Built-in chrome is still present alongside injected catalogs.
		expect(res.core.en['common.cancel']).toBe('Cancel');
	});

	it('lets mount-time translations override server-injected resources', () => {
		const res = buildClientResources({
			resources: { app: { en: { 'users.label': 'Users' } } },
			translations: { en: { 'users.label': 'People' } },
		});
		expect(res.app.en['users.label']).toBe('People');
	});

	it('localizes built-in chrome for a custom locale via injected `core` resources', () => {
		// Backend registered `core` chrome for French (a locale the package does not bundle)
		// plus an English override — both arrive via the injected resources.
		const res = buildClientResources({
			locales: ['en', 'fr'],
			resources: { core: { fr: { 'common.save': 'Enregistrer' }, en: { 'common.save': 'Store' } } },
		});
		// New locale gets chrome from the injected catalog.
		expect(res.core.fr['common.save']).toBe('Enregistrer');
		// Injected `core` overrides the bundled default for existing locales...
		expect(res.core.en['common.save']).toBe('Store');
		// ...while non-overridden bundled chrome keys stay intact.
		expect(res.core.en['common.cancel']).toBe('Cancel');
	});

	it('resolves chrome in a custom locale end-to-end through the engine', () => {
		const engine = buildClientI18n({
			locales: ['en', 'fr'],
			defaultLocale: 'en',
			resources: { core: { fr: { 'common.save': 'Enregistrer' } } },
		});
		expect(engine.t('core:common.save', { locale: 'fr' })).toBe('Enregistrer');
		expect(engine.getLocales()).toContain('fr');
	});
});

describe('useTranslation', () => {
	it('translates chrome + app keys (app overrides core)', () => {
		const { result } = renderHook(() => useTranslation(), { wrapper });
		expect(result.current.t('app:home.title')).toBe('Home');
		expect(result.current.t('core:common.save')).toBe('Save it'); // app override
		expect(result.current.t('core:common.cancel')).toBe('Cancel'); // package default
	});

	it('switching locale persists the choice and triggers a full refresh', () => {
		const reload = vi.fn();
		Object.defineProperty(window, 'location', { value: { reload }, writable: true });
		const { result } = renderHook(() => useLocale(), { wrapper });
		act(() => result.current.setLocale('sq'));
		expect(localStorage.getItem('kratosjs-locale')).toBe('sq');
		expect(document.documentElement.lang).toBe('sq');
		expect(reload).toHaveBeenCalled();
	});

	it('falls back to a default engine outside any provider', () => {
		const { result } = renderHook(() => useTranslation());
		expect(result.current.t('core:common.save')).toBe('Save'); // built-in default
	});
});

describe('LocaleSwitcher', () => {
	it('renders the registered locales and switches on change', async () => {
		const reload = vi.fn();
		Object.defineProperty(window, 'location', { value: { reload }, writable: true });
		render(
			<I18nProvider config={config}>
				<LocaleSwitcher />
			</I18nProvider>,
		);
		const select = screen.getByRole('combobox');
		expect(select).toBeInTheDocument();
		await userEvent.selectOptions(select, 'sq');
		expect(localStorage.getItem('kratosjs-locale')).toBe('sq');
		expect(document.documentElement.lang).toBe('sq');
		expect(reload).toHaveBeenCalled();
	});

	it('renders nothing for a single-locale panel', () => {
		render(
			<I18nProvider config={{ defaultLocale: 'en', locales: ['en'], translations: { en: {} } }}>
				<LocaleSwitcher />
			</I18nProvider>,
		);
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
	});
});

describe('useFormatter', () => {
	it('formats currency and relative time in the active locale', () => {
		const { result } = renderHook(() => useFormatter(), { wrapper });
		expect(result.current.currency(1234.5, 'USD')).toContain('1,234.50');
		expect(result.current.relativeTime(-2, 'hour')).toBe('2 hours ago');
	});
});
