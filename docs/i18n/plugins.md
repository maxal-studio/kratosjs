---
title: Plugins
---

# Plugin translations

Plugins are fully translatable, and a host app can override or extend any string a plugin ships.

## Backend: register catalogs in `register()`

A plugin registers its server catalogs in its `register()` hook, namespaced by the plugin name. Then
it uses `t('<plugin-name>:key')` anywhere on the server:

```typescript
import { Plugin, t } from '@maxal_studio/kratosjs';

export class TwoFactorPlugin extends Plugin {
	getName() {
		return '2fa';
	}

	register(panel: Panel) {
		panel.registerTranslations('2fa', {
			en: { 'settings.title': 'Two-factor authentication' },
			sq: { 'settings.title': 'Autentifikimi me dy faktorë' },
		});

		// ...use it later:
		// message: t('2fa:settings.title')
	}
}
```

## Frontend: ship `translations` in the client manifest

A plugin's client manifest carries `translations` (keyed by locale), auto-namespaced by the plugin
`name`. Its components reference them with `t('<plugin-name>:key')`:

```typescript
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import StarRatingField from './StarRatingField';

export default definePluginClient({
	name: '2fa',
	fields: { 'star-rating': StarRatingField },
	translations: {
		en: { 'challenge.prompt': 'Enter your code' },
		sq: { 'challenge.prompt': 'Shkruani kodin tuaj' },
	},
});
// in the component: t('2fa:challenge.prompt')
```

## Host overrides

Because catalogs merge **core → plugins → app** (app last), a host application always wins. The app
can override any plugin string, or add a locale the plugin didn't ship, by registering under the
plugin's namespace:

```typescript
// Backend — override a 2fa string and add a locale the plugin lacks.
panel.registerTranslations('2fa', {
	en: { 'settings.title': 'Security' }, // overrides the plugin's English value
	de: { 'settings.title': 'Sicherheit' }, // adds German
});
```

```typescript
// Frontend — override a plugin's client string via its namespace prefix.
mountAdminPanel({
	i18n: { translations: { en: { '2fa:challenge.prompt': 'Enter your 2FA code' } } },
});
```

This precedence is independent of timing: app-level registrations always take priority over
plugin-level ones, even though plugins register during `panel.start()`.
