---
title: Frontend
---

# Frontend translations

Backend-authored labels (resources, fields, columns, actions) arrive **already translated** in the
metadata and schemas the client fetches — you don't re-register them on the frontend. The frontend
i18n layer covers strings **authored in React**: the package's own UI chrome, your custom field /
page / widget components, and any plugin components.

## Where frontend strings live

Strings are merged from three layers (later wins) and held by the `I18nProvider`:

1. **Package chrome** — buttons, table controls, the login screen, etc. ship inside
   `@maxal_studio/kratosjs-react` (the `core` namespace), so the panel is translated out of the box.
2. **Server-injected catalogs** — your app and plugin catalogs, registered on the backend and
   injected into the page (`window.__VALAJS_I18N__`). The client reads these automatically.
3. **Mount-time overrides** — the optional `mountAdminPanel({ i18n: { translations } })`, for
   overriding a `core:` chrome string or adding a React-only one.

## No frontend config needed

Locales and every app/plugin catalog come from the backend, so the typical admin client needs **no**
i18n setup at all:

```typescript
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

mountAdminPanel(); // locales + catalogs arrive from window.__VALAJS_I18N__
```

Register your catalogs once on the backend instead — see [Backend translations](/i18n/backend):

```typescript
panel
	.i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' })
	.registerTranslations('app', { en: enApp, sq: sqApp });
```

### Localizing the built-in chrome for a custom language

The React package bundles chrome (buttons, table controls, the login screen, validation messages)
for the locales it ships. When you add a language the package doesn't cover — or want to reword a
built-in string — register those strings under the **`core` namespace on the backend**. They are
injected and merged over the bundled chrome, so the whole panel speaks the new language:

```typescript
// Backend — add French and translate the built-in chrome for it.
panel
	.i18n({ locales: ['en', 'fr'], defaultLocale: 'en', directions: { ar: 'rtl' } })
	.registerTranslations('app', { fr: frApp })
	.registerTranslations('core', {
		fr: { 'common.save': 'Enregistrer', 'common.cancel': 'Annuler' /* …the chrome keys you use… */ },
	});
```

The `core` keys are the ones the React package uses (`common.*`, `table.*`, `auth.*`, `validation.*`,
…). Provide the ones you want translated; anything you leave out falls back to the bundled locale.
RTL languages also honor the `directions` map above.

### Overriding chrome strings from the client (optional)

The `mountAdminPanel({ i18n })` option still exists as an escape hatch for client-only tweaks — use
it to override a `core:` chrome string or add a React-only string without a server round-trip. It
layers over the injected config:

```typescript
mountAdminPanel({
	i18n: { translations: { sq: { 'core:common.save': 'Ruaj' } } },
});
```

## Using translations in components

```tsx
import { useTranslation } from '@maxal_studio/kratosjs-react';

function MyWidget() {
	const { t, locale, dir } = useTranslation();
	return (
		<section dir={dir}>
			<h2>{t('app:dashboard.title')}</h2> {/* app string */}
			<button>{t('core:common.save')}</button> {/* package chrome */}
			<span>{t('app:items.count', { count: 3 })}</span> {/* ICU plural */}
		</section>
	);
}
```

## Locale-aware formatting

`useFormatter()` returns `Intl`-backed helpers bound to the active locale — use them instead of
hardcoding a locale:

```tsx
import { useFormatter } from '@maxal_studio/kratosjs-react';

function Stats({ amount, when }: { amount: number; when: Date }) {
	const fmt = useFormatter();
	return (
		<>
			<div>{fmt.currency(amount, 'EUR')}</div> {/* €1,234.50 */}
			<div>{fmt.dateTime(when)}</div>
			<div>{fmt.relativeTime(-2, 'hour')}</div> {/* "2 hours ago" */}
		</>
	);
}
```

## The locale switcher

`useLocale()` exposes the active locale and a setter; `<LocaleSwitcher />` is a ready-made control
(it renders only when more than one locale is registered, and already appears in the header account
menu and on the login screen):

```tsx
import { useLocale, LocaleSwitcher } from '@maxal_studio/kratosjs-react';

const { locale, setLocale, locales } = useLocale();
// or just drop in:
<LocaleSwitcher />;
```

Changing the locale persists the choice (`localStorage`), updates `<html lang/dir>`, and **reloads**
the app so cached table/form schemas and server-rendered labels all come back in the new language.

## Validation messages

Inline form validation renders through the same engine the server uses, so messages localize
automatically. The React package ships the `validation.*` keys (in the `core` namespace) for the
locales it supports; register your own to add a locale.
