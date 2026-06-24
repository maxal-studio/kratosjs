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
2. **App strings** — passed to `mountAdminPanel({ i18n: { translations } })`.
3. **Plugin strings** — a client plugin's `translations` (see [Plugin translations](/i18n/plugins)).

## Configuring `mountAdminPanel`

```typescript
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// Reuse the SAME catalog modules you registered on the backend — authored once, used on both sides.
import enApp from '../lang/en';
import sqApp from '../lang/sq';

mountAdminPanel({
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'sq'],
		translations: { en: enApp, sq: sqApp },
	},
});
```

App keys land in the `app` namespace. To **override a built-in chrome string**, prefix the key with
its namespace — `'core:common.save'`:

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
