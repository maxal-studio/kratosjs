---
title: HTTP Adapters
---

# HTTP Adapters

KratosJs core does not depend on any HTTP framework. Everything HTTP-shaped —
routes, requests, replies, cookies, middleware — is expressed through a small
framework-neutral contract, and an **adapter** translates that contract to a concrete
framework. Express (the default), Fastify, Hapi, and Koa ship as official adapters. Already
have a **NestJS** app? Mount a panel onto it with
[`@maxal_studio/kratosjs-nestjs`](/backend/nestjs). Anything else can be supported by
implementing the same contract.

## How it fits together

```text
┌───────────────────────────────────────────────┐
│ KratosJs core                                 │
│  • route table (fully composed handlers)      │
│  • KratosRequest / KratosReply                │
│  • auth, ORM context, i18n, error handling    │
│  • cookie serialization                       │
│  • AdminSpaService (Vite dev / static prod)   │
└───────────────┬───────────────────────────────┘
                │ KratosHttpAdapter contract
    ┌────────┬──────┴──┬────────┬──────────────┐
    ▼        ▼         ▼        ▼               ▼
 Express   Fastify   Hapi     Koa      InMemoryHttpAdapter
 (default) (official)(official)(official)(testing, in core)
```

The key design decision: **core composes the whole request pipeline itself** (auth →
resource resolution → request context → controller, wrapped in one error boundary) and
hands the adapter one plain handler per route. An adapter never implements middleware
semantics, cookie encoding, or error mapping — those behave identically on every framework.

## Official adapters

Four adapters are maintained in the monorepo. `kratosjs new` lets you pick one with
`--http express|fastify|hapi|koa` (Express is the default). All pass the identical contract
suite, so your custom routes and panel behavior are the same on any of them.

| Package                          | Class            | Escape hatch           |
| -------------------------------- | ---------------- | ---------------------- |
| `@maxal_studio/kratosjs-express` | `ExpressAdapter` | `getExpressApp(panel)` |
| `@maxal_studio/kratosjs-fastify` | `FastifyAdapter` | `getFastifyApp(panel)` |
| `@maxal_studio/kratosjs-hapi`    | `HapiAdapter`    | `getHapiApp(panel)`    |
| `@maxal_studio/kratosjs-koa`     | `KoaAdapter`     | `getKoaApp(panel)`     |

An adapter is required — `start()` throws a descriptive error without one.

### Express

```bash
npm install @maxal_studio/kratosjs-express
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';

const panel = Panel.make('admin').httpAdapter(new ExpressAdapter());
```

Mount onto an existing app with `new ExpressAdapter({ app })`.

### Fastify

```bash
npm install @maxal_studio/kratosjs-fastify
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { FastifyAdapter } from '@maxal_studio/kratosjs-fastify';

const panel = Panel.make('admin').httpAdapter(new FastifyAdapter());
```

Fastify fixes the body size limit at instance creation, so configure it on the adapter
rather than via `panel.http({ bodyLimit })`:

```typescript
panel.httpAdapter(new FastifyAdapter({ bodyLimit: '100mb' }));
```

Mount onto an existing instance with `new FastifyAdapter({ app })`.

### Hapi

```bash
npm install @maxal_studio/kratosjs-hapi
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { HapiAdapter } from '@maxal_studio/kratosjs-hapi';

const panel = Panel.make('admin').httpAdapter(new HapiAdapter());
```

Like Fastify, Hapi fixes the payload limit at server creation — set it on the adapter:

```typescript
panel.httpAdapter(new HapiAdapter({ bodyLimit: '100mb' }));
```

Mount onto an existing server with `new HapiAdapter({ app })`.

### Koa

```bash
npm install @maxal_studio/kratosjs-koa
```

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { KoaAdapter } from '@maxal_studio/kratosjs-koa';

const panel = Panel.make('admin').httpAdapter(new KoaAdapter());
```

Koa honors `panel.http({ bodyLimit })` (unlike Fastify/Hapi). Mount onto an existing app
with `new KoaAdapter({ app })`.

### Escape hatch: the native app

```typescript
import { getExpressApp } from '@maxal_studio/kratosjs-express';

const app = getExpressApp(panel); // typed; equivalent to panel.getServer<Express>()
app.get('/raw', (req, res) => res.send('raw express'));
```

The Fastify, Hapi, and Koa packages export the analogous `getFastifyApp(panel)` /
`getHapiApp(panel)` / `getKoaApp(panel)`. Register raw routes **before** `panel.start()` so
they precede the admin SPA catch-all (Fastify and Hapi additionally forbid adding routes
after the server starts; for Koa, bring your own `@koa/router`).

## HTTP options

```typescript
panel.http({
	bodyLimit: '50mb', // JSON body limit (uploads travel as base64 JSON)
	cors: { origin: true, credentials: true }, // or false to disable
});

panel.adminClient(false); // headless / API-only: skip serving the admin SPA

panel.panelPath('/admin'); // serve the admin UI under /admin (default '/'); frees the rest
```

When `panelPath` is non-root, the SPA fallback and its assets are scoped to that path — any
adapter serves the panel only under it, and every other path falls through (404 / your own
routes). No client/Vite config is needed: the server drives the Vite base from `panelPath`.
See [Backend Setup → Admin panel path](/backend-setup#admin-panel-path).

## Framework-neutral handlers

Custom routes and panel middleware use the neutral types — they run unchanged on any
adapter:

```typescript
import type { KratosRequest, KratosReply, KratosMiddleware } from '@maxal_studio/kratosjs';

panel.registerRoute('get', '/hello/:name', (req: KratosRequest, reply: KratosReply) => {
	reply.json({ hello: req.params.name, locale: req.header('accept-language') });
});

const audit: KratosMiddleware = async (req, _reply, next) => {
	console.log(req.method, req.path, req.ip);
	await next();
};
panel.middleware([audit]);
```

| `KratosRequest`                        | `KratosReply`                                  |
| -------------------------------------- | ---------------------------------------------- |
| `method`, `path`, `url`                | `status(code)` (chainable)                     |
| `params`, `query`, `body`              | `header(name, value)` (chainable)              |
| `headers`, `header(name)`, `cookies`   | `cookie(...)` / `clearCookie(...)` (chainable) |
| `protocol`, `host`, `ip`               | `json(payload)`                                |
| `authUser`, `panelResource`, `panel`   | `send(string \| Buffer)`, `html(body)`         |
| media helpers (`resolveMediaUrl`, ...) | `redirect(url)`, `redirectTo(path, data)`      |
| `raw` — the native request             | `sent`, `raw` — the native response            |

## Testing without a framework

Core ships a reference adapter built on bare `node:http`, plus the contract test suite —
useful for integration tests that shouldn't depend on Express:

```typescript
import { InMemoryHttpAdapter } from '@maxal_studio/kratosjs/testing';

const adapter = new InMemoryHttpAdapter();
panel.httpAdapter(adapter).adminClient(false);
await panel.start(0); // ephemeral port
const url = `http://127.0.0.1:${adapter.getPort()}`;
```

## Next steps

- [NestJS Integration](/backend/nestjs) — mount a panel onto an existing NestJS app
- [Writing an Adapter](/backend/writing-an-adapter) — implement the contract for another framework
- [Backend Setup](/backend-setup) — the day-to-day server configuration
