import { describe, expect, it } from 'vitest';
import { Panel } from '../src/Panel';
import { ExpressAdapter } from '../src/adapters/http/ExpressAdapter';

// The admin HTML carries the i18n config so the client auto-configures from the
// server (see ExpressAdapter.transformIndexHtml). This verifies the injection
// shape and the <-escaping that prevents a catalog value from breaking the script.

const TEMPLATE = [
	'<!DOCTYPE html><html><head>',
	'<!-- VALAJS_PANEL_TITLE -->',
	'<!-- VALAJS_PANEL_FAVICON -->',
	'<!-- VALAJS_PANEL_SETTINGS -->',
	'</head><body><div id="root"></div></body></html>',
].join('\n');

function transform(panel: Panel): string {
	const adapter = new ExpressAdapter(panel, panel.getBasePath());
	return (adapter as unknown as { transformIndexHtml(html: string): string }).transformIndexHtml(TEMPLATE);
}

function extractInjectedI18n(html: string): unknown {
	const match = html.match(/window\.__VALAJS_I18N__ = (\{.*?\});/s);
	if (!match) throw new Error('window.__VALAJS_I18N__ not injected');
	return JSON.parse(match[1]);
}

describe('ExpressAdapter i18n injection', () => {
	it('injects window.__VALAJS_I18N__ with the panel locale config + app/plugin catalogs', () => {
		const panel = Panel.make('admin').i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' });
		panel.registerTranslations('app', { en: { 'home.title': 'Home' }, sq: { 'home.title': 'Ballina' } });
		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();

		const html = transform(panel);
		expect(html).toContain('window.__VALAJS_I18N__ = {');

		const cfg = extractInjectedI18n(html) as {
			locales: string[];
			defaultLocale: string;
			resources: Record<string, Record<string, Record<string, string>>>;
		};
		expect(cfg.locales).toEqual(['en', 'sq']);
		expect(cfg.defaultLocale).toBe('en');
		expect(cfg.resources.app.en['home.title']).toBe('Home');
		expect(cfg.resources.app.sq['home.title']).toBe('Ballina');
		// Framework core stays bundled with the client — never injected.
		expect(cfg.resources.core).toBeUndefined();
	});

	it('escapes < so a catalog value cannot break out of the <script> tag', () => {
		const panel = Panel.make('admin').i18n({ locales: ['en'], defaultLocale: 'en' });
		panel.registerTranslations('app', { en: { 'x.evil': 'a </script><script>alert(1)</script> b' } });
		(panel as unknown as { buildServerI18n(): void }).buildServerI18n();

		const html = transform(panel);
		// The raw closing tag must not appear inside the injected JSON...
		expect(html).toContain('\\u003c/script>');
		// ...and the value still round-trips back to its original form.
		const cfg = extractInjectedI18n(html) as { resources: Record<string, Record<string, Record<string, string>>> };
		expect(cfg.resources.app.en['x.evil']).toBe('a </script><script>alert(1)</script> b');
	});
});
