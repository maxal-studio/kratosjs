import { describe, expect, it, beforeAll } from 'vitest';
import { BaseResource, TextInput, FormBuilder, StatsWidget, Panel, t } from '../src';
import { registerServerI18n } from '../src/i18n/serverT';
import { createI18n } from '../src/i18n/KratosI18n';
import { requestContextStorage } from '../src/RequestContextStorage';
import type { RequestContext } from '../src/RequestContext';

// Phase 3 — translation happens in place via t(); no serialize-time pass.
// Because builder methods run per request, t() sees the active locale and the
// serialized output is already localized.

class UserResource extends BaseResource {
	static slug = 'users';
	// STATIC label → getter so getLabel() re-resolves per request.
	static get label() {
		return t('app:users.label');
	}
	static get pluralLabel() {
		return t('app:users.plural');
	}

	static form() {
		return FormBuilder.make().schema([TextInput.make('email').label(t('app:users.fields.email'))]);
	}
}

function inLocale<T>(locale: string, fn: () => T): T {
	const ctx = { activeLocale: locale, query: {}, headers: {} } as RequestContext;
	return requestContextStorage.run(ctx, fn);
}

describe('backend t() in builders', () => {
	beforeAll(() => {
		const i18n = createI18n({
			locales: ['en', 'sq'],
			defaultLocale: 'en',
			resources: {
				app: {
					en: {
						'users.label': 'Users',
						'users.plural': 'Users',
						'users.fields.email': 'Email',
						'users.widgets.total': 'Total Users',
					},
					sq: {
						'users.label': 'Përdoruesit',
						'users.plural': 'Përdoruesit',
						'users.fields.email': 'Email-i',
						'users.widgets.total': 'Përdorues gjithsej',
					},
				},
			},
		});
		registerServerI18n(i18n, 'en');
	});

	it('static-getter label resolves to the active request locale', () => {
		expect(inLocale('en', () => UserResource.getLabel())).toBe('Users');
		expect(inLocale('sq', () => UserResource.getLabel())).toBe('Përdoruesit');
	});

	it('field labels built per request serialize already-translated', () => {
		const en = inLocale('en', () => UserResource.form().toJSON());
		const sq = inLocale('sq', () => UserResource.form().toJSON());
		const enEmail = (en.components as any[]).find(c => c.statePath === 'email' || c.name === 'email');
		const sqEmail = (sq.components as any[]).find(c => c.statePath === 'email' || c.name === 'email');
		expect(enEmail.label).toBe('Email');
		expect(sqEmail.label).toBe('Email-i');
	});

	it('plain string labels (no t()) pass through unchanged', () => {
		const field = TextInput.make('name').label('Full name');
		expect(field.getLabel()).toBe('Full name');
	});

	it('widgets are built per request so their t() labels localize (regression)', () => {
		// Widgets are NOT cached at registration (that froze t() to the raw key);
		// Panel.buildResourceWidgets() rebuilds them per request, inside the context.
		class WidgetRes extends BaseResource {
			static slug = 'wr';
			static widgets() {
				return [StatsWidget.make('total').label(t('app:users.widgets.total'))];
			}
		}
		const panel = Panel.make('admin');
		const registered = { resourceClass: WidgetRes } as never;

		const en = inLocale('en', () => panel.buildResourceWidgets(registered).get('total')!.toJSON());
		const sq = inLocale('sq', () => panel.buildResourceWidgets(registered).get('total')!.toJSON());
		expect((en as { label?: string }).label).toBe('Total Users');
		expect((sq as { label?: string }).label).toBe('Përdorues gjithsej');
	});
});
