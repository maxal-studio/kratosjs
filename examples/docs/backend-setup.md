---
title: Backend Setup
---

## Panel branding

Configure how your admin panel appears in the browser tab, header, and login screen:

```typescript
const adminPanel = Panel.make('admin')
	.title('My Admin')
	.icon('LayoutDashboard') // Lucide icon for header + login when no favicon image
	.favicon('/assets/logo.png'); // Browser tab + logo image in header/login (takes precedence)
```

| Method      | Purpose                                                                  |
| ----------- | ------------------------------------------------------------------------ |
| `title()`   | Panel name shown in the admin header and login screen                    |
| `icon()`    | Lucide icon name for in-app branding (same convention as resource icons) |
| `favicon()` | Image URL for the browser tab **and** the header/login logo              |

When `favicon()` is set, that image is used as the visible logo in the UI. Otherwise the Lucide icon from `icon()` is shown. Both values are exposed on `GET /meta` so the login page can load branding before authentication.

Serve static assets (favicons, logos) with `useStatic()`:

```typescript
adminPanel.useStatic('/assets', path.join(process.cwd(), 'assets'));
```

In production, the favicon is also injected into the admin HTML shell automatically.

## What Panel Automatically Handles

When you create a Panel instance, it automatically:

1. **Creates Express app**: No need to manually create `express()`
2. **Registers default middlewares**:
    - CORS (with credentials support)
    - Cookie parser
    - JSON body parser (50MB limit for file uploads)
3. **Initializes MikroORM**: Collects entities from resources and plugins, runs migrations (SQL), and optionally updates schema
4. **Mounts panel routes**: All resource routes are automatically mounted at the base path
5. **Registers static file serving**: LocalMediaAdapter automatically sets up static file serving based on `publicUrl`

## Registering Custom Routes

You can register custom routes that automatically get:

- Base path prepended
- Authentication middleware (if auth is configured)
- Media helpers middleware

```typescript
adminPanel.registerRoute('post', '/dashboard/stats', async (req, res) => {
	const em = adminPanel.getEm();
	const stats = { userCount: await em.count('User', {}) };
	res.json(stats);
});
```

### Route Registration Methods

Supported HTTP methods: `get`, `post`, `put`, `patch`, `delete`

### Route Order

Custom routes are registered **after** panel routes, so panel routes take precedence if there's a conflict.

## Static File Serving

When you register a `LocalMediaAdapter`, Panel automatically sets up static file serving:

```typescript
adminPanel.mediaAdapters([
	new LocalMediaAdapter({
		name: 'local-uploads',
		uploadPath: path.join(process.cwd(), 'uploads'),
		publicUrl: `http://localhost:${PORT}/uploads`,
		createDirectories: true,
		isDefault: true,
	}),
]);
```

For additional static assets (favicons, etc.):

```typescript
adminPanel.useStatic('/assets', path.join(process.cwd(), 'assets'));
```

## Starting the Server

```typescript
await adminPanel.start(PORT, async () => {
	console.log(`🚀 Server running on http://localhost:${PORT}`);
	console.log(`📊 Admin Panel: ${adminPanel.getBasePath()}`);
});
```

The callback is optional and runs after the server starts listening. Use it for seeding data.

## App Layout: Server + Admin Client

A KratosJs app is split into two parts that live side by side:

```text
examples/sql-app/                    # reference layout
├── index.html                       # admin HTML template
├── vite.config.mts                  # kratosAdminVite() factory
├── package.json                     # dev / build / start scripts
├── tsconfig.json                    # server only — excludes **/*.tsx
└── src/
    ├── index.ts                     # server entry (Panel, plugins, auth)
    ├── admin/
    │   └── main.tsx                 # admin client entry (mountAdminPanel)
    ├── entities/
    ├── resources/
    └── migrations/
```

### Server entry (`src/index.ts`)

Configures the panel, registers plugins and resources, sets up auth, and calls `panel.start()`. This is always required.

### Admin client entry (`src/admin/main.tsx`)

Mounts the React admin panel and statically imports plugin client manifests so custom components are bundled at build time. **Always required** — every KratosJs app uses the same three files (`index.html`, `vite.config.mts`, `src/admin/main.tsx`) regardless of plugin usage.

Production (`NODE_ENV=production`) **requires** a built admin bundle at `dist/admin/` — run `npm run build` before `npm run start`. The server throws a clear error if the build is missing.

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// import myPlugin from '@my-scope/kratosjs-plugin-my-plugin/client';

mountAdminPanel({
	// plugins: [myPlugin],
});
```

### Scripts and builds

| Script         | What it does                                                                          |
| -------------- | ------------------------------------------------------------------------------------- |
| `dev`          | Runs `src/index.ts`; vite-express serves `index.html` + `src/admin/main.tsx` with HMR |
| `build`        | Builds backend and front end                                                          |
| `build:server` | `tsc` — compiles `src/index.ts` and server code to `dist/`                            |
| `build:admin`  | `vite build` — bundles the admin client to `dist/admin/`                              |
| `start`        | `NODE_ENV=production node dist/index.js` — serves the static admin bundle             |

See [Getting Started](/getting-started) for the full walkthrough and [Custom Components](/plugins/custom-components) for plugin client manifests.

## Complete Example

See `examples/app/src/index.ts` for a full working MongoDB setup with auth, seeding, and media uploads:

```typescript
import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';
import { PostResource } from './resources/PostResource';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';

const PORT = 3001;

const adminPanel = Panel.make('admin')
	.orm({ driver: MongoDriver, clientUrl: 'mongodb://localhost:27017', dbName: 'kratosjs' }, { updateSchema: true })
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: path.join(process.cwd(), 'uploads'),
			publicUrl: `http://localhost:${PORT}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	])
	.resources([UserResource, PostResource]);

adminPanel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'your-secret-key',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	// `userEntity` enables the default validateCredentials + getUserById.
	// Override either, map field names with `userFields`, or add more providers.
	userEntity: User,
	providers: [new EmailAuthProvider()],
});

await adminPanel.start(PORT, async () => {
	await seedAdminUser(adminPanel);
	console.log('🔐 Login: admin@example.com / password');
});
```

For a MySQL example with plugins, admin client, and migrations, see `examples/sql-app/` (`src/index.ts` + `src/admin/main.tsx`).

## Next Steps

- [Database & MikroORM](/database/overview) — entities, drivers, and configuration
- [Creating Resources](/resources/creating-resources) — build your first resource
- [Authentication](/authentication/overview) — JWT and auth providers
- [Media Management](/media/overview) — file uploads and storage
