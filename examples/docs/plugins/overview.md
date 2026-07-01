# Plugins Overview

Plugins are a powerful way to extend KratosJs Panel functionality. They are standalone npm packages that encapsulate related features (entities, migrations, resources, pages, routes, hooks, and React components) into reusable, installable modules.

## Quick Start

Scaffold a new plugin with the CLI:

```bash
npx @maxal_studio/kratosjs-cli plugin my-plugin --client
```

See [Creating Plugins](./creating-plugins.md) for the full walkthrough, package layout, and examples. For entities, SQL migrations, and the `boot()` seeding hook, see [Entities & Migrations](./migrations.md).

## What are Plugins?

A plugin is an npm package with up to two entry points:

- **Server entry** (`.`) — a class extending `Plugin` plus any Field/Column builder classes, entities, migrations, and resources
- **Client entry** (`./client`, optional) — a manifest of React components (fields, columns, widgets, blocks) created with `definePluginClient`

Plugins can register:

- **Entities** - MikroORM entity schemas for plugin-owned tables (driver-agnostic: SQL and MongoDB)
- **Migrations** - migrations that run during `panel.start()` (registered per database driver)
- **Resources** - New data models and their CRUD operations
- **Pages** - Custom pages with widgets, forms, and tables
- **Routes** - Custom API endpoints
- **Hooks** - Event handlers for resource operations
- **Custom component names** - fields/columns/widgets/blocks rendered by the React components shipped in the client entry
- **Slots** - extra React elements injected into fixed UI locations (header, sidebar, table toolbar, form footer, detail modal, …) that stack with the app's and other plugins' contributions (see [Slots](/customization/slots))
- **Validation rules** - custom rules that validate on both the client and the server (see [Custom Validation Rules](./creating-plugins.md#custom-validation-rules))
- **Translations** - server + client catalogs, namespaced by plugin name, that host apps can override (see [Plugin Translations](/i18n/plugins))

## Why Use Plugins?

1. **Modularity** - Organize related functionality into self-contained packages
2. **Reusability** - Install the same plugin in multiple projects (`npm install @maxal_studio/kratosjs-plugin-cms`)
3. **Database ownership** - Ship entities and migrations with the plugin, working on both SQL and MongoDB
4. **Production-ready UI** - Client components are statically bundled by the app's Vite build (dev and production)
5. **Easy Management** - Enable/disable features by adding/removing plugins

## Plugin Package Format

```text
plugins/star-rating/
├── package.json          exports: { ".": server, "./client": client }
├── src/
│   ├── index.ts          server: Plugin class, Field/Column classes, entities, migrations
│   ├── StarRatingPlugin.ts
│   └── client/
│       ├── index.ts      client manifest (definePluginClient)
│       └── StarRatingField.tsx
```

Key `package.json` conventions:

- `peerDependencies`: `react`, `@maxal_studio/kratosjs-react`, `@maxal_studio/kratosjs`, optional `@mikro-orm/*` — React is never bundled inside a plugin
- Real runtime dependencies (e.g. `bcrypt`) go in `dependencies`
- Dual exports map:

```json
{
	"exports": {
		".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
		"./client": { "types": "./dist/client/index.d.ts", "default": "./dist/client/index.js" }
	}
}
```

## Plugin Lifecycle

Plugins are registered during panel configuration and activated during `Panel.start()`:

1. `register(panel)` — register entities, resources, pages, routes, migrations. `panel.getDriverKind()` is available here, so plugins can build driver-specific entities and register only the migrations matching the active driver
2. MikroORM initializes with all collected entities
3. Migrations run, then optional schema updates (`updateSchema: true`)
4. `boot(em, panel)` — optional idempotent seeding hook

## Basic Plugin Structure

```typescript
import { Plugin, Panel } from '@maxal_studio/kratosjs';
import { createCmsEntities } from './entities';
import { PostResource } from './resources/PostResource';
import { Migration20250101000000CreateCmsTables } from './migrations/sql/Migration20250101000000CreateCmsTables';

export class CmsPlugin extends Plugin {
	getName(): string {
		return 'cms';
	}

	register(panel: Panel): void {
		const driver = panel.getDriverKind(); // 'sql' | 'mongo'
		const { Post } = createCmsEntities(driver);

		PostResource.entity = Post;
		panel.registerEntities([Post]);

		// SQL migrations only; MongoDB relies on updateSchema + boot seeding
		if (driver === 'sql') {
			panel.registerMigrations([Migration20250101000000CreateCmsTables]);
		}

		panel.registerResource(PostResource);
	}

	async boot(em): Promise<void> {
		// Optional idempotent seeding
	}
}
```

## Registering Plugins

Plugins can be registered as classes or as configured instances:

```typescript
import { CmsPlugin } from '@maxal_studio/kratosjs-plugin-cms';
import { ProfilePlugin } from '@maxal_studio/kratosjs-plugin-profile';
import { DashboardPlugin } from '@maxal_studio/kratosjs-plugin-dashboard';

const adminPanel = Panel.make('admin')
	.path('/api')
	.orm({ driver: MySqlDriver /* ... */ }, { migrate: true, updateSchema: true })
	.resources([UserResource])
	.plugins([
		CmsPlugin, // class — instantiated by the panel
		new ProfilePlugin({ userEntity: 'User' }), // configured instance
		new DashboardPlugin({ widgetResources: [UserResource], tables: [] }),
	]);

await adminPanel.start(3000);
```

## Plugin Capabilities

### Register Entities & Migrations

```typescript
register(panel: Panel): void {
  const driver = panel.getDriverKind();
  const { Category, Post, Comment } = createCmsEntities(driver);
  panel.registerEntities([Category, Post, Comment]);
  if (driver === 'sql') {
    panel.registerMigrations([Migration20250101000000CreateCmsTables]);
  }
}
```

### Register Resources

```typescript
register(panel: Panel): void {
  panel.registerResource(PostResource);
}
```

### Register Pages

```typescript
register(panel: Panel): void {
  panel.registerPage(DashboardPage);
}
```

### Register Routes

Routes registered via plugins automatically get the base path, auth middleware, and media helpers:

```typescript
register(panel: Panel): void {
  panel.registerRoute('post', '/my-endpoint', async (req, res) => {
    const user = req.authUser;
    res.json({ message: 'Hello from plugin!' });
  });
}
```

### Register Hooks

```typescript
register(panel: Panel): void {
  panel.registerResourceHooks(UserResource, {
    afterCreate: [async (ctx) => {
      console.log('User created:', ctx.output.records[0]);
    }],
  });
}
```

### Authorize, Transform & Observe Media

Plugins interact with media through two layers. **Authorization** (single-handler) gates what
may be uploaded/deleted and guards against arbitrary-key deletion:

```typescript
register(panel: Panel): void {
  panel.registerMediaUploadAccessCheckHook(async (ctx) => ctx.user?.role === 'editor');
  panel.registerMediaDeleteAccessCheckHook(async (ctx) => mediaIsOwnedBy(ctx.key, ctx.user?.id));
}
```

**Lifecycle hooks** (array-based, stackable) transform the bytes before storage, link files to
their owners, log, and audit failures:

```typescript
register(panel: Panel): void {
  panel.registerMediaHooks({
    beforeMediaUpload: [async (ctx) => { ctx.file = await compress(ctx.file); }],
    afterMediaUpload: [async (ctx) => linkMedia(ctx.result!.key, ctx)],
    afterMediaDelete: [async (ctx) => unlinkMedia(ctx.key)],
  });
}
```

See [Media → Hooks](/media/hooks) for the full lifecycle and `MediaHookContext` fields.

### Register Custom Component Names

Server-side, plugins register only the component **names** (used for metadata and validation). The actual React components ship in the plugin's `./client` entry and are bundled by the app:

```typescript
register(panel: Panel): void {
  panel.registerCustomField('star-rating');
  panel.registerCustomColumn('star-rating');
  panel.registerCustomWidget('card');
}
```

See [Custom Components](./custom-components.md) for the client side.

### Contribute UI Slots

Plugins can inject extra React elements into fixed locations in the panel chrome — a header button, a banner above a table, an action in the detail modal — through the `slots` field of their client manifest. Slots are purely client-side (no `register()` call) and **stack**: every plugin's and the app's contributions to the same slot render together.

```typescript
// my-plugin/src/client/index.ts
export default definePluginClient({
  name: 'audit',
  slots: {
    'detail.afterDetails': {
      id: 'audit-trail',
      render: ({ resourceSlug, record }) => <AuditTrail resourceSlug={resourceSlug} record={record} />,
    },
  },
});
```

See [Slots](/customization/slots) for the full list of built-in slot names, their context, and mobile/overflow behavior.

### Globally Configure Tables, Forms, Actions & Fields

Plugins can mutate **every** builder in the panel with `configureUsing` — add a header button to every table, force confirmation on destructive actions, add a column everywhere:

```typescript
register(panel: Panel): void {
  TableBuilder.configureUsing(table => {
    table.headerActions([...table.getHeaderActions(), Action.make('exportCsv').label('Export').exportsTo('csv')]);
  });
}
```

### Register Exporters

Plugins can add downloadable export formats consumed by the core `POST /:resource/export` endpoint:

```typescript
panel.registerExporter('csv', csvExporter);
```

See [Global Configuration](./global-configuration.md) for both.

### Register Translations

Plugins register their full translation catalog (server labels **and** component strings, namespaced
by the plugin name) on the server in `register()`. The server injects them into the admin page, so
the plugin's React components pick them up automatically — the `definePluginClient` manifest carries
no translations. Host apps can override any string or add locales the plugin didn't ship:

```typescript
panel.registerTranslations('2fa', {
	en: { 'settings.title': 'Two-factor authentication' },
	sq: { 'settings.title': 'Autentifikimi me dy faktorë' },
});
```

See [Plugin Translations](/i18n/plugins) for the full server + client + override flow.

## Wiring Plugins in Your App

Every app already has `src/admin/main.tsx` (scaffolded via `npx @maxal_studio/kratosjs-cli init` or auto-created on first dev start). Plugins touch **two** entry points:

| File                 | What to do                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `src/index.ts`       | Register plugin classes: `.plugins([CmsPlugin, new ProfilePlugin({ ... })])`             |
| `src/admin/main.tsx` | Import plugin `/client` manifests and pass them to `mountAdminPanel({ plugins: [...] })` |

Only plugins with custom React components need a `/client` import added to `src/admin/main.tsx` — server-only plugins (e.g. logging, profile, dashboard) are registered in `src/index.ts` only.

```typescript
// src/index.ts
.plugins([MyPlugin, new AnotherPlugin({ ... })])

// src/admin/main.tsx
import myPlugin from '@my-scope/kratosjs-plugin-my-plugin/client';
mountAdminPanel({ plugins: [myPlugin] });
```

See [Getting Started](/getting-started) for the full app layout and [Custom Components](./custom-components.md) for the client manifest format.

See [Creating Plugins](./creating-plugins.md) for detailed examples.
