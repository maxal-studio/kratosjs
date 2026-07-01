import { describe, expect, it, beforeEach } from 'vitest';
import { Panel } from '../src/Panel';
import { resolveRequestLocale, parseAcceptLanguage } from '../src/i18n/resolveRequestLocale';
import { t, withLocale, registerServerI18n, resolveServerLocale } from '../src/i18n/serverT';
import { createI18n } from '../src/i18n/KratosI18n';
import { requestContextStorage } from '../src/RequestContextStorage';
import type { RequestContext } from '../src/RequestContext';

// Phase 2 — request-locale resolution + the universal server t().

describe('parseAcceptLanguage', () => {
	it('orders tags by q-value and lowercases them', () => {
		expect(parseAcceptLanguage('en-US,sq;q=0.9,de;q=0.8')).toEqual(['en-us', 'sq', 'de']);
		expect(parseAcceptLanguage('sq;q=0.2,en;q=0.9')).toEqual(['en', 'sq']);
		expect(parseAcceptLanguage(undefined)).toEqual([]);
	});
});

describe('resolveRequestLocale', () => {
	const registered = ['en', 'sq'];

	it('prefers ?locale, then header, then Accept-Language, then default', () => {
		expect(resolveRequestLocale({ query: { locale: 'sq' } }, registered, 'en')).toBe('sq');
		expect(resolveRequestLocale({ headers: { 'x-kratosjs-locale': 'sq' } }, registered, 'en')).toBe('sq');
		expect(resolveRequestLocale({ headers: { 'accept-language': 'sq,en;q=0.5' } }, registered, 'en')).toBe('sq');
		expect(resolveRequestLocale({}, registered, 'en')).toBe('en');
	});

	it('matches a regional subtag to its base (sq-AL → sq)', () => {
		expect(resolveRequestLocale({ query: { locale: 'sq-AL' } }, registered, 'en')).toBe('sq');
	});

	it('ignores unregistered locales and falls back to default', () => {
		expect(resolveRequestLocale({ query: { locale: 'de' } }, registered, 'en')).toBe('en');
	});
});

describe('server t() + withLocale', () => {
	beforeEach(() => {
		const i18n = createI18n({
			locales: ['en', 'sq'],
			defaultLocale: 'en',
			resources: {
				app: { en: { 'users.label': 'Users' }, sq: { 'users.label': 'Përdoruesit' } },
			},
		});
		registerServerI18n(i18n, 'en');
	});

	it('resolves against the default locale with no active context', () => {
		expect(t('app:users.label')).toBe('Users');
	});

	it('honors an explicit { locale } override', () => {
		expect(t('app:users.label', {}, { locale: 'sq' })).toBe('Përdoruesit');
	});

	it('reads the active locale from the request context', () => {
		const ctx = { activeLocale: 'sq', query: {}, headers: {} } as RequestContext;
		requestContextStorage.run(ctx, () => {
			expect(t('app:users.label')).toBe('Përdoruesit');
			expect(resolveServerLocale()).toBe('sq');
		});
	});

	it('withLocale scopes the active locale (cron/queue use)', () => {
		withLocale('sq', () => {
			expect(t('app:users.label')).toBe('Përdoruesit');
		});
		// outside the scope the default is restored
		expect(t('app:users.label')).toBe('Users');
	});

	it('explicit { locale } beats the withLocale scope', () => {
		withLocale('sq', () => {
			expect(t('app:users.label', {}, { locale: 'en' })).toBe('Users');
		});
	});
});

describe('Panel i18n registration + merge precedence', () => {
	it('merges core → plugins → app so app overrides win, and discovers locales', () => {
		const panel = Panel.make('admin').i18n({
			locales: ['en', 'sq'],
			defaultLocale: 'en',
		});
		// App registers its own namespace + an override of a plugin key.
		panel.registerTranslations('app', { en: { 'home.title': 'Home' }, sq: { 'home.title': 'Ballina' } });
		panel.registerTranslations('myplugin', { en: { 'settings.title': 'Preferences' } });

		// Simulate plugin registration (routes into the plugin bucket, which loses to app).
		(panel as unknown as { _registeringPlugins: boolean })._registeringPlugins = true;
		panel.registerTranslations('myplugin', {
			en: { 'settings.title': 'Settings', 'settings.sub': 'Plugin sub' },
			sq: { 'settings.title': 'Cilësimet' },
		});
		(panel as unknown as { _registeringPlugins: boolean })._registeringPlugins = false;

		// Build the merged instance (normally done inside start()).
		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();
		const i18n = panel.getServerI18n()!;

		expect(i18n.t('app:home.title')).toBe('Home');
		expect(i18n.t('app:home.title', { locale: 'sq' })).toBe('Ballina');
		// App override wins over the plugin's value...
		expect(i18n.t('myplugin:settings.title')).toBe('Preferences');
		// ...but plugin-only keys (and locales) remain available.
		expect(i18n.t('myplugin:settings.sub')).toBe('Plugin sub');
		expect(i18n.t('myplugin:settings.title', { locale: 'sq' })).toBe('Cilësimet');
		// Core namespace is always present.
		expect(i18n.t('core:action.completed')).toBe('Action completed successfully');
		expect(i18n.t('core:action.completed', { locale: 'sq' })).toBe('Veprimi u krye me sukses');
	});

	it('resolveLocale uses registered locales', () => {
		const panel = Panel.make('admin').i18n({ locales: ['en', 'sq'], defaultLocale: 'en' });
		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();
		expect(panel.resolveLocale({ query: { locale: 'sq' } })).toBe('sq');
		expect(panel.resolveLocale({ query: { locale: 'fr' } })).toBe('en');
	});
});

describe('Panel.getClientI18nConfig (injected into the admin HTML)', () => {
	it('exposes plugin + app catalogs (app wins), excludes framework core, and carries locale config', () => {
		const panel = Panel.make('admin').i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' });
		panel.registerTranslations('app', { en: { 'home.title': 'Home' }, sq: { 'home.title': 'Ballina' } });

		// Plugin registration routes into the plugin bucket (loses to app on collision).
		(panel as unknown as { _registeringPlugins: boolean })._registeringPlugins = true;
		panel.registerTranslations('twofa', { en: { title: 'Settings', hint: 'Plugin hint' } });
		panel.registerTranslations('app', { en: { 'home.title': 'PluginHome' } }); // should be overridden below
		(panel as unknown as { _registeringPlugins: boolean })._registeringPlugins = false;

		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();
		const cfg = panel.getClientI18nConfig();

		expect(cfg.locales).toEqual(['en', 'sq']);
		expect(cfg.defaultLocale).toBe('en');
		expect(cfg.fallbackLocale).toBe('en');
		// App + plugin namespaces are present...
		expect(cfg.resources.app.en['home.title']).toBe('Home'); // app wins over plugin
		expect(cfg.resources.twofa.en['title']).toBe('Settings');
		expect(cfg.resources.twofa.en['hint']).toBe('Plugin hint');
		// ...but the framework's backend `core` namespace is NOT injected (client bundles its own).
		expect(cfg.resources.core).toBeUndefined();
	});

	it('injects app-registered `core` overrides so chrome can be localized for a custom language', () => {
		// A host adds French — a locale the React package does not bundle chrome for —
		// and translates the built-in chrome by registering under the `core` namespace.
		const panel = Panel.make('admin')
			.i18n({ defaultLocale: 'en', directions: { ar: 'rtl' } })
			.registerTranslations('app', { fr: { 'users.label': 'Utilisateurs' } })
			.registerTranslations('core', { fr: { 'common.save': 'Enregistrer' }, en: { 'common.save': 'Store' } });
		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();

		const cfg = panel.getClientI18nConfig();
		// The custom locale is discovered from the registered catalogs.
		expect(cfg.locales).toContain('fr');
		// App-registered `core` chrome IS injected (unlike the framework's server core).
		expect(cfg.resources.core.fr['common.save']).toBe('Enregistrer');
		expect(cfg.resources.core.en['common.save']).toBe('Store'); // overrides the bundled default
		// Direction overrides ride along for RTL custom locales.
		expect(cfg.directions).toEqual({ ar: 'rtl' });
	});
});
