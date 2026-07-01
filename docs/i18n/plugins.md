---
title: Plugins
---

# Plugin translations

Plugins are fully translatable, and a host app can override or extend any string a plugin ships.

## Register the whole catalog on the backend

A plugin registers **all** of its strings — server labels **and** the strings its React components
use — in its `register()` hook, namespaced by the plugin name. There is no separate frontend catalog:
the server injects these into the admin page, so the plugin's components read them automatically.

```typescript
import { Plugin, t } from '@maxal_studio/kratosjs';

export class TwoFactorPlugin extends Plugin {
	getName() {
		return '2fa';
	}

	register(panel: Panel) {
		panel.registerTranslations('2fa', {
			en: { 'settings.title': 'Two-factor authentication', 'challenge.prompt': 'Enter your code' },
			sq: { 'settings.title': 'Autentifikimi me dy faktorë', 'challenge.prompt': 'Shkruani kodin tuaj' },
		});

		// Server code:      t('2fa:settings.title')
		// React components:  useTranslation().t('2fa:challenge.prompt')
	}
}
```

The client manifest carries only components (fields, columns, challenges, slots…) — **not**
translations:

```typescript
import { definePluginClient } from '@maxal_studio/kratosjs-react';
import TwoFactorChallenge from './TwoFactorChallenge';

export default definePluginClient({
	name: '2fa',
	authChallenges: { '2fa-totp': TwoFactorChallenge },
	// no `translations` here — they live on the backend
});
// in the component: useTranslation().t('2fa:challenge.prompt')
```

## Host overrides

Because catalogs merge **core → plugins → app** (app last), a host application always wins. The app
overrides any plugin string — server or component — or adds a locale the plugin didn't ship, by
registering under the plugin's namespace on the backend:

```typescript
// Backend — override 2fa strings and add a locale the plugin lacks.
panel.registerTranslations('2fa', {
	en: { 'settings.title': 'Security', 'challenge.prompt': 'Enter your 2FA code' }, // override
	de: { 'settings.title': 'Sicherheit' }, // adds German
});
```

Since the client reads the merged catalogs the server injects, this single registration covers both
the server labels and the plugin's React components — no frontend change is needed.

This precedence is independent of timing: app-level registrations always take priority over
plugin-level ones, even though plugins register during `panel.start()`.
