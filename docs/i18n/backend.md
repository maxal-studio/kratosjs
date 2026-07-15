---
title: Backend
---

# Backend translations

The backend is the **single source of truth** for i18n. You register your locales and catalogs here
once; the server localizes its own output with `t()` **and** injects the locale config + catalogs
into the admin HTML so the React client configures itself with no duplicate setup (see
[Frontend translations](/i18n/frontend)). A single `t()` function resolves keys to strings against
the active request locale, and you can use it anywhere on the server.

## Registering catalogs

Catalogs are plain `{ [locale]: { [key]: value } }` objects. Author each locale in its own module and
register it under a namespace (defaults to `app`):

```typescript
// lang/en.ts
export default {
	'users.label': 'Users',
	'users.fields.email': 'Email',
	'actions.published': '{count, plural, one {Published # item} other {Published # items}}',
	'emails.welcome': 'Welcome, {name}!',
};
// lang/sq.ts → the same keys with Albanian values
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import enApp from './lang/en';
import sqApp from './lang/sq';

const panel = Panel.make('admin')
	.i18n({ locales: ['en', 'sq'], defaultLocale: 'en', fallbackLocale: 'en' })
	.registerTranslations('app', { en: enApp, sq: sqApp });
```

`registerTranslations(namespace, catalogs)` can be called multiple times and by plugins; the
namespace defaults to `app` when omitted: `panel.registerTranslations({ en, sq })`.

Register **every** app string here — including ones only used in React components — since the client
gets its catalogs from what you register on the backend. Author each `lang/*.ts` module once and
import it only in your server entry.

## Using `t()` in builders

Call `t()` directly wherever you'd write a label. Because `form()`, `table()`, `actions()`,
`widgets()` and `blocks()` run **per request**, `t()` resolves to that request's locale and the
serialized output is already translated:

```typescript
import {
	BaseResource,
	FormBuilder,
	TextInput,
	TableBuilder,
	TextColumn,
	Action,
	type ActionHandler,
	t,
} from '@maxal_studio/kratosjs';

class UserResource extends BaseResource {
	static slug = 'users';

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('email').label(t('app:users.fields.email')),
			TextInput.make('name').label('Full name'), // a plain string still works — t() is opt-in
		]);
	}

	static table() {
		return TableBuilder.make()
			.columns([TextColumn.make('email').label(t('app:users.fields.email'))])
			.actions([Action.make('publish').label(t('app:actions.publish'))]);
	}

	static actions(): Record<string, ActionHandler> {
		return {
			publish: async ({ records = [] }) => ({
				success: true,
				message: t('app:actions.published', { count: records.length }), // already translated
			}),
		};
	}
}
```

## Static labels need a getter

Static class fields (`static label`, `static pluralLabel`, `static navigationGroup`, and a page's
`static label`) are evaluated **once at module load**, before any request — so calling `t()` there
would freeze to the default locale. Use a **static getter** instead, which re-resolves per request:

```typescript
class UserResource extends BaseResource {
	static slug = 'users';
	static get label() {
		return t('app:users.label');
	}
	static get pluralLabel() {
		return t('app:users.plural');
	}
}
```

Field, column, action and block labels need **no** getter — their methods already run per request.

::: tip
The same rule applies to any module-level constant array of labels you define yourself. Either build
it inside a function called per request, or store catalog keys and translate them at the point of use.
:::

## `t()` outside a request — custom routes & cron

`t()` works in custom routes (which run in the request context) and in code with no request at all.
For the latter — cron jobs, queues, per-recipient emails — pass an explicit locale or scope one:

```typescript
import { t, withLocale, adminRoute } from '@maxal_studio/kratosjs';

// Custom route — uses the request's active locale automatically. `adminRoute(panel)`
// makes it an authenticated endpoint under the panel base path.
panel.route('get', '/welcome', adminRoute(panel), (req, reply) => {
	reply.json({ message: t('app:emails.welcome', { name: req.authUser?.name }) });
});

// Per-recipient — pin a specific locale regardless of any request.
const body = t('app:emails.invoice', { total }, { locale: user.preferredLang });

// Cron / background job — scope a locale for everything inside.
await withLocale('sq', async () => {
	logger.info(t('app:jobs.summary', { n: 42 }));
});
```

## Locale resolution

The active request locale is resolved in this order, restricted to your registered `locales`
(a regional subtag like `sq-AL` matches its base `sq`):

1. `?locale=` query parameter
2. `X-KratosJs-Locale` header (sent by the React client with its current UI locale)
3. `Accept-Language` header
4. the panel `defaultLocale`

`t(key, params, { locale })` always overrides the resolved locale for that one call.

## Validation messages

Built-in validation rules emit a structured `messageKey` + `params` (not a baked English string),
so they're translated wherever they're shown. The `core` namespace ships the `validation.*` keys in
every locale you support — add the locale and they're covered automatically. A custom per-field
message is just a string, so you can pass `t('app:...')` to `.validationMessages(...)`.
