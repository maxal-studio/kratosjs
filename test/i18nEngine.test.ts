import { describe, expect, it } from 'vitest';
import { createI18n } from '../src/i18n';

// Phase 1 — the isomorphic engine (browser-safe wrapper over i18next).

const resources = {
	core: {
		en: { 'common.save': 'Save', 'items.count': '{count, plural, one {# item} other {# items}}' },
		sq: { 'common.save': 'Ruaj', 'items.count': '{count, plural, one {# artikull} other {# artikuj}}' },
	},
	app: {
		en: { 'users.label': 'Users', welcome: 'Welcome, {name}' },
		sq: { 'users.label': 'Përdoruesit', welcome: 'Mirë se erdhe, {name}' },
	},
};

describe('createI18n', () => {
	it('resolves a namespaced key in the default locale', () => {
		const i18n = createI18n({ locales: ['en', 'sq'], defaultLocale: 'en', resources });
		expect(i18n.t('core:common.save')).toBe('Save');
		expect(i18n.t('app:users.label')).toBe('Users');
	});

	it('resolves a bare key against the default namespace (app)', () => {
		const i18n = createI18n({ locales: ['en', 'sq'], defaultLocale: 'en', resources });
		expect(i18n.t('users.label')).toBe('Users');
	});

	it('honors a per-call { locale } override (concurrency-safe, no changeLanguage)', () => {
		const i18n = createI18n({ locales: ['en', 'sq'], defaultLocale: 'en', resources });
		expect(i18n.t('core:common.save', { locale: 'sq' })).toBe('Ruaj');
		// The default locale is unchanged after a scoped call.
		expect(i18n.t('core:common.save')).toBe('Save');
	});

	it('interpolates params', () => {
		const i18n = createI18n({ defaultLocale: 'en', resources });
		expect(i18n.t('app:welcome', { name: 'Ada' })).toBe('Welcome, Ada');
		expect(i18n.t('app:welcome', { name: 'Ada', locale: 'sq' })).toBe('Mirë se erdhe, Ada');
	});

	it('handles ICU plurals via i18next-icu', () => {
		const i18n = createI18n({ locales: ['en', 'sq'], defaultLocale: 'en', resources });
		expect(i18n.t('core:items.count', { count: 1 })).toBe('1 item');
		expect(i18n.t('core:items.count', { count: 3 })).toBe('3 items');
		expect(i18n.t('core:items.count', { count: 3, locale: 'sq' })).toBe('3 artikuj');
	});

	it('falls back to the fallback locale for a missing key', () => {
		const i18n = createI18n({
			locales: ['en', 'sq'],
			defaultLocale: 'sq',
			fallbackLocale: 'en',
			resources: { app: { en: { 'only.en': 'English only' }, sq: {} } },
		});
		expect(i18n.t('app:only.en')).toBe('English only');
	});

	it('returns the bare key string when nothing matches', () => {
		const i18n = createI18n({ defaultLocale: 'en', resources });
		expect(i18n.t('app:does.not.exist')).toBe('does.not.exist');
	});

	it('reports supported locales and direction', () => {
		const i18n = createI18n({ locales: ['en', 'ar'], defaultLocale: 'en', resources: { app: { en: {}, ar: {} } } });
		expect(i18n.getLocales().sort()).toEqual(['ar', 'en']);
		expect(i18n.getDir('en')).toBe('ltr');
		expect(i18n.getDir('ar')).toBe('rtl');
	});

	it('addBundle merges a catalog into a namespace after init', () => {
		const i18n = createI18n({ locales: ['en', 'sq'], defaultLocale: 'en', resources });
		i18n.addBundle('plugin2fa', 'en', { 'challenge.title': 'Verify' });
		i18n.addBundle('plugin2fa', 'sq', { 'challenge.title': 'Verifiko' });
		expect(i18n.t('plugin2fa:challenge.title')).toBe('Verify');
		expect(i18n.t('plugin2fa:challenge.title', { locale: 'sq' })).toBe('Verifiko');
	});
});
