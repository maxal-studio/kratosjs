---
title: Migrating to v2
---

# Migrating from v1 to v2

v2's headline change: **the HTTP framework is pluggable**. Core no longer depends on
Express — a small adapter package provides it, and every request/response surface is
framework-neutral. Most apps migrate in a few minutes.

## 1. Install the Express adapter and set it

```bash
npm install @maxal_studio/kratosjs-express
```

```typescript
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';

const adminPanel = Panel.make('admin').httpAdapter(new ExpressAdapter()); // ← new, required
// ... everything else unchanged
```

You can remove `express` from your app's direct dependencies unless you use the raw
Express escape hatch.

## 2. Update custom route handlers

Handlers now receive framework-neutral `KratosRequest` / `KratosReply` instead of Express
`req` / `res`. For typical JSON routes the code is nearly identical:

```typescript
// v1
adminPanel.registerRoute('get', '/greet', (req, res) => {
	res.json({ hello: req.query.name });
});

// v2
adminPanel.registerRoute('get', '/greet', (req, reply) => {
	reply.json({ hello: req.query.name });
});
```

| v1 (Express)                     | v2 (neutral)                               |
| -------------------------------- | ------------------------------------------ |
| `res.json(x)` / `res.status(n)`  | same: `reply.json(x)` / `reply.status(n)`  |
| `res.setHeader(k, v)`            | `reply.header(k, v)`                       |
| `res.send(body)`                 | `reply.send(body)` (string or Buffer)      |
| `res.redirect(url)`              | `reply.redirect(url)`                      |
| `res.redirectTo(path, data)`     | same: `reply.redirectTo(path, data)`       |
| `res.cookie` / `res.clearCookie` | same names on `reply` (maxAge still in ms) |
| `req.get('host')`                | `req.host` (or `req.header('host')`)       |
| `req.headers.authorization`      | `req.header('authorization')`              |
| Raw Express request/response     | `req.raw` / `reply.raw`                    |

New in v2: custom routes get the request context, so `getRequestContext()` and
server-side `t()` work inside them without `withLocale` wrappers.

## 3. Panel middleware signature

`panel.middleware([...])` keeps its name but takes neutral middleware:

```typescript
// v1: (req, res, next) Express RequestHandler
// v2:
panel.middleware([
	async (req, reply, next) => {
		console.log(req.method, req.path);
		await next(); // next() returns a promise
	},
]);
```

## 4. Escape hatch replaces `getApp()`

```typescript
// v1
const app = adminPanel.getApp();

// v2 (typed)
import { getExpressApp } from '@maxal_studio/kratosjs-express';
const app = getExpressApp(adminPanel); // = adminPanel.getServer<Express>()
```

`getApp()` still exists but is deprecated. Register raw framework routes **before**
`start()` so they precede the admin SPA catch-all.

## 5. Removed / changed APIs

| v1 API                                              | v2 replacement                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------ |
| `panel.httpAdapter(AdapterClass)`                   | `panel.httpAdapter(adapterInstance)`                                     |
| `HttpAdapter` (abstract class)                      | `KratosHttpAdapter` (new contract)                                       |
| `panel.attachAuth()` / `panel.attachMediaHelpers()` | gone — auth + media helpers are applied automatically                    |
| `panel.ormContextMiddleware()`                      | `panel.ormContextStep()` (rarely needed — automatic)                     |
| `AuthManager.getRoutes(): Router`                   | `AuthManager.getRouteDefinitions()`                                      |
| `KratosJsRequest` / `KratosJsResponse` types        | `KratosRequest` / `KratosReply` (old names remain as deprecated aliases) |
| `AuthHookContext.req: express.Request`              | `req: KratosRequest` (native request at `req.raw`)                       |
| vite-express (dev serving)                          | Vite middleware mode, embedded — no action needed                        |

## 6. New options (optional)

```typescript
panel.http({ bodyLimit: '50mb', cors: { origin: true, credentials: true } });
panel.adminClient(false); // headless / API-only deployment
await panel.stop(); // graceful shutdown (tests)
```

## 7. Scaffolded apps

`kratosjs new` (v2 CLI) already produces the v2 layout — the only template differences are
the `@maxal_studio/kratosjs-express` dependency and the `.httpAdapter(new ExpressAdapter())`
line. Existing apps: apply steps 1–4 above.

## Endpoint compatibility

All HTTP endpoints, payload shapes, cookies, and the injected client globals are
**unchanged** — the React admin client works identically against a v1 and v2 backend, and
no data migration is needed.
