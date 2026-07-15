---
title: Backend Setup
---

# HTTP Adapter

KratosJs core is **HTTP-framework agnostic**. A small adapter package wires the
panel to a concrete framework. `kratosjs new` installs one for you
(`--http express|fastify|hapi|koa`, Express by default):

```bash
npm install @maxal_studio/kratosjs-express   # or -fastify / -hapi / -koa
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';

const adminPanel = Panel.make('admin').httpAdapter(new ExpressAdapter());
```

Prefer Fastify, Hapi, or Koa? Swap two lines — everything else (resources, auth, custom
routes) is identical:

```typescript
import { FastifyAdapter } from '@maxal_studio/kratosjs-fastify';
// or HapiAdapter from '@maxal_studio/kratosjs-hapi', KoaAdapter from '@maxal_studio/kratosjs-koa'

const adminPanel = Panel.make('admin').httpAdapter(new FastifyAdapter());
```

An adapter is **required** — `start()` throws a descriptive error without one. Other
frameworks (NestJS, ...) can be supported by implementing the same contract; see
[HTTP Adapters](/backend/http-adapters) and [Writing an Adapter](/backend/writing-an-adapter).

```typescript
// Optional HTTP behavior (defaults shown):
adminPanel.http({
	bodyLimit: '50mb', // JSON limit — file uploads travel as base64 JSON
	cors: { origin: true, credentials: true },
});
```

# Admin panel path

By default the admin UI is served at the domain root (`/`), and the API lives at its own
base path (`.path()`, default `/kratosjs/api`). To relocate the UI — e.g. to `/admin`,
freeing `/` for your own landing page — set `panelPath`:

```typescript
const adminPanel = Panel.make('admin').httpAdapter(new ExpressAdapter()).panelPath('/admin'); // SPA + its assets now served under /admin; '/' is free
```

With `panelPath('/admin')`: `GET /admin` (and any `/admin/*` client route) serves the
panel, `GET /admin/assets/*` serves its bundle, and everything outside `/admin` returns
404 — ready for your own routes (add them via the framework-native instance, e.g.
`getExpressApp(panel).get('/', ...)`, **before** `panel.start()`). The API base path is
unaffected.

**This is the only thing you set** — `.panelPath()` on the backend. No `vite.config`
change is needed: the admin client is built with a relative asset base, and the KratosJs
server drives the Vite base from `panelPath` (setting it on the dev server and rewriting the
built `index.html`'s asset URLs in production). The React client also picks up its router
basename automatically from a server-injected global. `vite.config.mts` stays a plain
`export default defineConfig(kratosAdminVite())`.

# Panel branding

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

When you start a Panel, it automatically:

1. **Drives the HTTP adapter**: creates the framework app (e.g. Express), installs CORS and
   JSON body parsing (50MB limit for base64 file uploads) per your `http()` options
2. **Parses cookies**: handled by the core on every adapter — no cookie middleware needed
3. **Initializes MikroORM**: collects entities from resources and plugins, runs migrations (SQL), and optionally updates schema
4. **Registers panel routes**: every resource/auth/media endpoint is registered at the base path with a fully composed pipeline (ORM context, locale, auth, request context, error handling)
5. **Registers static file serving**: LocalMediaAdapter automatically sets up static file serving based on `publicUrl`
6. **Serves the admin SPA**: with HMR through Vite in development, as a static bundle in production (disable with `adminClient(false)` for headless/API-only deployments)

## Registering Custom Routes

Custom route handlers are **framework-neutral**: they receive a `KratosRequest` and a
`KratosReply` and run unchanged on any HTTP adapter. `panel.route()` registers a **bare,
public, top-level** route (no base-path prefix, no auth) whose reply can also render a
view. Every route gets the request context — `getRequestContext()` and server-side `t()`
work inside handlers — plus media helpers (`req.transformMediaFieldsForStorage`, etc.).

For an **authenticated API endpoint under the panel base path** (what the admin client
calls), add the `adminRoute(panel)` middleware — it prefixes the base path and requires
auth:

```typescript
import { adminRoute } from '@maxal_studio/kratosjs';

adminPanel.route('post', '/dashboard/stats', adminRoute(adminPanel), async (req, reply) => {
	const em = adminPanel.getEm();
	const stats = { userCount: await em.count('User', {}) };
	reply.json(stats);
});
```

> `panel.registerRoute(...)` still works (deprecated) and is exactly
> `panel.route(method, path, adminRoute(panel), ...handlers)`. Other opt-in middleware:
> `requireAuth` / `optionalAuth` (auth without a prefix), `viewAuth` (protected pages),
> `csrfProtection`.

### The request and reply

```typescript
adminPanel.route('get', '/demo/:id', adminRoute(adminPanel), async (req, reply) => {
	req.method; // 'GET'
	req.params.id; // path params
	req.query; // parsed query string
	req.body; // parsed JSON body
	req.cookies; // parsed cookies
	req.header('x-my-header'); // case-insensitive header lookup
	req.authUser; // the authenticated user
	req.raw; // escape hatch: the framework-native request

	reply
		.status(200)
		.header('X-Custom', 'value')
		.cookie('name', 'value', { httpOnly: true, maxAge: 60_000 })
		.json({ ok: true }); // terminal: json / send / html / redirect / redirectTo
});
```

Supported HTTP methods: `get`, `post`, `put`, `patch`, `delete`.

Pass multiple handlers and all but the last act as middleware (they receive `next`):

```typescript
adminPanel.route(
	'get',
	'/reports',
	async (req, reply, next) => {
		if (!req.authUser) return reply.status(401).json({ error: 'No' });
		await next();
	},
	async (req, reply) => reply.json({ report: [] }),
);
```

### Route Order

Custom routes are registered **before** panel routes, so a custom route wins over the
panel's `/:resource/...` patterns if there's a conflict.

### Escape hatch: the raw framework instance

When you need more than the neutral API (raw middleware, streaming, websockets), grab the
native app from the adapter. This ties the code to a specific adapter — prefer
`panel.route()` for anything portable:

```typescript
import { getExpressApp } from '@maxal_studio/kratosjs-express';

// Register raw routes BEFORE start() so they precede the admin SPA catch-all.
const app = getExpressApp(adminPanel); // or adminPanel.getServer<Express>()
app.get('/raw-express', (req, res) => res.send('raw express route'));
```

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
`await adminPanel.stop()` shuts the server down (useful in tests).

## App Layout: Server + Admin Client

A KratosJs app is split into two parts that live side by side:

```text
examples/sql-app/                    # reference layout
├── index.html                       # admin HTML template
├── vite.config.mts                  # kratosAdminVite() factory
├── package.json                     # dev / build / start scripts
├── tsconfig.json                    # server only — excludes **/*.tsx
└── src/
    ├── index.ts                     # server entry (Panel, adapter, plugins, auth)
    ├── admin/
    │   └── main.tsx                 # admin client entry (mountAdminPanel)
    ├── entities/
    ├── resources/
    └── migrations/
```

### Server entry (`src/index.ts`)

Configures the panel, sets the HTTP adapter, registers plugins and resources, sets up auth, and calls `panel.start()`. This is always required.

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

| Script         | What it does                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `dev`          | Runs `src/index.ts`; the server embeds Vite (middleware mode) to serve the admin client with HMR |
| `build`        | Builds backend and front end                                                                     |
| `build:server` | `tsc` — compiles `src/index.ts` and server code to `dist/`                                       |
| `build:admin`  | `vite build` — bundles the admin client to `dist/admin/`                                         |
| `start`        | `NODE_ENV=production node dist/index.js` — serves the static admin bundle                        |

See [Getting Started](/getting-started) for the full walkthrough and [Custom Components](/plugins/custom-components) for plugin client manifests.

## Complete Example

See `examples/app/src/index.ts` for a full working MongoDB setup with auth, seeding, and media uploads:

```typescript
import 'dotenv/config';
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';
import { PostResource } from './resources/PostResource';
import { User } from './entities/User';
import { seedAdminUser } from './seedAdminUser';

const PORT = 3001;

const adminPanel = Panel.make('admin')
	.httpAdapter(new ExpressAdapter())
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

- [HTTP Adapters](/backend/http-adapters) — the pluggable HTTP layer
- [Database & MikroORM](/database/overview) — entities, drivers, and configuration
- [Creating Resources](/resources/creating-resources) — build your first resource
- [Authentication](/authentication/overview) — JWT and auth providers
- [Media Management](/media/overview) — file uploads and storage
