# Plugins & the React client

## The React client entry

The admin UI is mounted in `src/admin/main.tsx`:

```tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';
import { twoFactorClient } from '@maxal_studio/kratosjs-plugin-2fa/client';
import { ResetTimer } from './ResetTimer';

mountAdminPanel({
	plugins: [twoFactorClient /* , profileClient, permissionsClient */],
	slots: {
		'panel.footer': { id: 'reset-timer', render: () => <ResetTimer /> },
	},
});
```

- `plugins` — client manifests from plugin `/client` subpaths.
- `slots` — inject custom React into named UI slots (e.g. `panel.footer`). Each slot entry is `{ id, render }`.

## Using plugins on the backend

Register plugin instances on the panel: `.plugins([new LoggingPlugin(), new CsvExportPlugin(), new PermissionsPlugin({ superAdminRoleIds: [1] })])`. Common official plugins: 2FA, logging, profile, csv-export, permissions. Each ships a matching client manifest imported in `main.tsx`.

## Scaffolding a plugin

```bash
npx @maxal_studio/kratosjs-cli plugin my-plugin --client   # --client adds a client-side field/component
```

This generates a plugin package with a server plugin class (`{{PluginName}}Plugin.ts`) and, with `--client`, a client manifest + component.

## Plugin shape

A plugin is a class the panel calls during setup. It can:

- register **resources**, **pages**, **routes**, **hooks**, **validation rules**;
- add **auth providers** or **login steps**;
- patch existing entities (e.g. the permissions plugin adds a `role` relation to `User`);
- register **translations** (`registerTranslations`).

Keep plugin entities **driver-agnostic**. Declare `@maxal_studio/kratosjs` (and React libs for the client) as **peer dependencies**.

## Client customizations

Custom **fields**, **columns**, **widgets**, and **blocks** follow the same two-part pattern: a backend class that serializes config + data, and a React component registered on the client via the plugin manifest (`definePluginClient` from `@maxal_studio/kratosjs-react`), referenced by name. Register the component in the plugin's client manifest, then include that manifest in `mountAdminPanel({ plugins: [...] })`.

For the full plugin authoring guide (routes, resource plugins, hooks plugins, custom validation rules, custom components), see the framework's plugin documentation.
