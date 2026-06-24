---
title: Overview
---

# Internationalization (i18n)

KratosJs has first-class multilingual support across the **backend and the frontend**, for both
the panel and plugins. You register translation catalogs, call a `t()` function wherever you write
user-facing text, and KratosJs renders it in the active locale.

## The model

- **`t()` returns a real string.** Call `t('users.fields.email')` anywhere — a field label, an action
  message, a custom route, a cron job — and it returns the translated string for the active locale.
  There are no special wrapper types and no build step; labels stay plain strings.
- **The backend is the translation authority.** Because KratosJs owns the backend, the server can
  translate content that never touches a browser (emails, exports, scheduled jobs) and it localizes
  the resource/field/action labels it serializes to the client. The server `t()` resolves against the
  request's active locale.
- **The frontend localizes its own chrome.** The React package ships translated UI strings (buttons,
  table controls, the login screen…) and exposes `useTranslation()` / `useFormatter()` for any text
  you author in custom components.
- **Catalogs are plain objects.** A catalog is `{ 'some.key': 'Some text' }`. Register them on the
  backend (`panel.registerTranslations`) and/or the frontend (`mountAdminPanel({ i18n })`). Because
  they're just modules, you can author one `lang/en.ts` file and import it on **both** sides.

```typescript
import { t } from '@maxal_studio/kratosjs';

t('app:users.label'); // → "Users"  /  "Përdoruesit"
t('app:emails.welcome', { name: 'Ada' }); // → "Welcome, Ada"
t('app:items.count', { count: 3 }); // → "3 items" (ICU plural)
```

## Keys, namespaces & interpolation

Keys are flat, dotted strings (`users.fields.email`). They live in a **namespace**, selected with a
`ns:` prefix:

- `core:` — framework strings (validation, built-in buttons, table controls). Shipped by KratosJs.
- `app:` — your application's strings. The **default** namespace, so `t('users.label')` and
  `t('app:users.label')` are equivalent.
- `<plugin-name>:` — a plugin's strings, namespaced by the plugin name.

Interpolation uses `{param}`; pluralization uses ICU syntax (powered by i18next + i18next-icu):

```typescript
// catalog
export default {
	welcome: 'Welcome, {name}',
	'items.count': '{count, plural, one {# item} other {# items}}',
};
```

A **missing key returns the key string** — there is no "literal fallback", so always register the
keys you reference.

## Two active locales

|                   | Source                                                                                  | Used for                                                |
| ----------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Server locale** | per request: `?locale` → `X-KratosJs-Locale` header → `Accept-Language` → panel default | server `t()` — labels, action messages, emails, exports |
| **Client locale** | the admin's switcher choice, persisted in `localStorage`, sent as `X-KratosJs-Locale`   | React chrome + which locale the server renders data in  |

When the admin switches language, the client persists the choice and reloads, so every view —
including server-rendered labels — comes back in the new locale.

## Configuration

Configure locales once on the panel:

```typescript
panel.i18n({
	locales: ['en', 'sq'], // supported locales
	defaultLocale: 'en', // used when the request doesn't ask for one
	fallbackLocale: 'en', // used for keys missing in the active locale
});
```

## Where to go next

- [Backend translations](/i18n/backend) — `registerTranslations`, the server `t()`, static labels,
  per-recipient locales, cron jobs.
- [Frontend translations](/i18n/frontend) — `mountAdminPanel({ i18n })`, `useTranslation`,
  `useFormatter`, the locale switcher.
- [Plugin translations](/i18n/plugins) — shipping catalogs from a plugin and overriding them.
