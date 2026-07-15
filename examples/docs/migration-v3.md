---
title: Migrating to v3
---

# Migrating from v2 to v3

v3's headline change: **KratosJs is now a full-stack framework, not just an admin
builder.** A new SSR layer ("Views") lets you build public, SEO-ready
React pages served straight from your backend, alongside the admin panel. The route
API is unified around a single primitive.

Most apps upgrade in a few minutes — nothing is removed, only added and deprecated.

## 1. Bump the packages

Move every `@maxal_studio/kratosjs*` dependency to `^3.0.0`. They are versioned in
lockstep (core, the HTTP adapters, `-react`, the CLI).

```bash
npm install @maxal_studio/kratosjs@^3 @maxal_studio/kratosjs-express@^3 @maxal_studio/kratosjs-react@^3
```

## 2. `registerRoute` → `route` (optional, non-breaking)

`panel.registerRoute(...)` still works exactly as before — it is now a thin alias.
The new `panel.route()` is the single route primitive for public pages, custom API,
and admin routes. It is **bare and public by default** (top-level path, no auth); you
opt into admin behavior with the `adminRoute(panel)` middleware:

```typescript
import { adminRoute } from '@maxal_studio/kratosjs';

// v2 — still works (deprecated):
panel.registerRoute('post', '/reindex', handler);

// v3 — equivalent (base-path-prefixed + auth required):
panel.route('post', '/reindex', adminRoute(panel), handler);

// v3 — a public, un-prefixed, unauthenticated route:
panel.route('get', '/health', (_req, reply) => reply.json({ ok: true }));
```

Other opt-in middleware: `requireAuth` / `optionalAuth` (auth without prefixing),
`viewAuth` (HTML-aware login redirect for protected pages), `csrfProtection`.

## 3. Plugins auto-wire on the client (optional)

The scaffold's `src/admin/main.tsx` now imports from `virtual:kratos-client`, which
auto-imports the client manifest of every installed plugin (any dependency whose
`package.json` declares a `kratosjs.client` entry):

```tsx
import { pluginClients } from 'virtual:kratos-client';
mountAdminPanel({ plugins: pluginClients });
```

Passing an explicit `plugins: [...]` array still works — no change required.

## 4. Add server-rendered pages (new, opt-in)

Views are **enabled by default** — just register a `route()` handler that
`reply.view(...)`:

```typescript
panel.panelPath('/admin'); // free up '/' for your front end

panel.route('get', '/', (_req, reply) => reply.view('Home', { title: 'Welcome' }));
```

The SSR machinery activates when the app has the views client present (`views.html` +
`src/views/*` in dev, or a `dist/views` build in prod). Call `panel.views(config)` only
to configure it, or `panel.views(false)` to disable it.

Then add the client build files (`vite.views.config.mts`, `views.html`,
`src/views/entry-client.tsx`, `entry-server.tsx`, `src/views/pages/*.tsx`) — in
development the server auto-scaffolds them — and a build script:

```json
"build:views": "vite build -c vite.views.config.mts && vite build -c vite.views.config.mts --ssr src/views/entry-server.tsx"
```

Page components use `@maxal_studio/kratosjs-react/views` (`usePage`, `<Link>`,
`<Head>`, `useForm`, `router`). See the Views guide for the full protocol.

## Reserved names

v3 reserves the `/views/assets` path (configurable via `views({ assetsBase })`), the
`errors` view prop key, and the `kratosjs_csrf` / `kratosjs_view_flash` cookies. Make
sure your app does not already use these.
