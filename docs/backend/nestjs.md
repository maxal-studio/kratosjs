---
title: NestJS Integration
---

# NestJS Integration

NestJS is a meta-framework that runs on the same two platforms KratosJs already supports —
`@nestjs/platform-express` (the default) and `@nestjs/platform-fastify`. So instead of an
adapter that _owns_ the server, `@maxal_studio/kratosjs-nestjs` **mounts a panel onto your
existing Nest app**: KratosJs registers its routes and admin SPA on Nest's underlying
instance, and Nest keeps ownership of the HTTP server and lifecycle.

One package covers both platforms — `mountKratos()` detects which one Nest is running on and
loads the matching KratosJs adapter automatically.

## Install

```bash
npm install @maxal_studio/kratosjs @maxal_studio/kratosjs-nestjs @maxal_studio/kratosjs-express
```

On Fastify, install `@maxal_studio/kratosjs-fastify` instead of `-express`.

## Wire it up

In `main.ts`, mount the panel **after** `NestFactory.create()` and **before**
`app.listen()`:

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { mountKratos } from '@maxal_studio/kratosjs-nestjs';
import { AppModule } from './app.module';
import { buildAdminPanel } from './panel';

async function bootstrap() {
	const app = await NestFactory.create(AppModule, { bodyParser: false });

	await mountKratos(app, buildAdminPanel());

	await app.listen(3000);
}
bootstrap();
```

`buildAdminPanel()` is an ordinary KratosJs panel — resources, auth, ORM, i18n, media — with
**no `.httpAdapter()` call**; `mountKratos` sets that for you.

### Disable Nest's body parser

Nest's default JSON body parser has a **100 kb** limit and runs before KratosJs's own parser.
KratosJs sends media uploads as base64 JSON (50 mb by default), which Nest would reject with a
`413`. Create the app with `{ bodyParser: false }` so KratosJs owns JSON parsing:

```typescript
const app = await NestFactory.create(AppModule, { bodyParser: false });
```

On Fastify the body limit is fixed at instance creation, so set it on Nest's platform
adapter instead (`new FastifyAdapter({ bodyLimit: 52428800 })`).

## What you get

With `panel.panelPath('/admin')`, the three surfaces coexist cleanly:

| Path              | Served by                                               |
| ----------------- | ------------------------------------------------------- |
| `/`               | **your Nest controllers** — the panel is out of the way |
| `/admin`          | the KratosJs admin UI (SPA)                             |
| `/kratosjs/api/*` | the panel API (CRUD, auth, meta)                        |

Without `.panelPath()`, the admin UI is served from `/` as usual.

## How it works

`mountKratos(app, panel)`:

1. Reads the framework instance via `app.getHttpAdapter().getInstance()`.
2. Detects Express vs Fastify and lazily imports the matching KratosJs adapter, constructing
   it over that instance — the same `new ExpressAdapter({ app })` / `new FastifyAdapter({ app })`
   entry points documented in [HTTP Adapters](/backend/http-adapters).
3. Wraps it in a `NestAdapter` whose `listen()` is a **no-op** (Nest owns listening) and runs
   `panel.start(0)` — the full mount sequence (static, routes, admin SPA) plus ORM init,
   plugins, and i18n, with no port bound.

Nest binds the port when you later call `app.listen()`.

## Fastify caveat

On Fastify the panel **API** works out of the box. The admin **SPA fallback** registers a
fastify `setNotFoundHandler`, which can collide with Nest's own not-found handler. For the
full admin UI, prefer Express; or serve the built SPA separately and run the panel headless
with `panel.adminClient(false)`.

## Next steps

- [HTTP Adapters](/backend/http-adapters) — the adapter model and the `{ app }` mount option
- [Backend Setup](/backend-setup) — day-to-day panel configuration
