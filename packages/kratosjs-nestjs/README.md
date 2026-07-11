# @maxal_studio/kratosjs-nestjs

NestJS integration for [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels.

KratosJs core is HTTP-framework agnostic. NestJS runs on the same two platforms KratosJs
already supports — `@nestjs/platform-express` (default) and `@nestjs/platform-fastify` — so
this package mounts a panel **onto your existing Nest app** instead of owning the server. One
package covers both platforms: `mountKratos()` auto-detects which one Nest is using.

## Install

```bash
npm install @maxal_studio/kratosjs @maxal_studio/kratosjs-nestjs @maxal_studio/kratosjs-express
# on Fastify, install @maxal_studio/kratosjs-fastify instead of -express
```

## Usage

In `main.ts`, mount the panel **after** `NestFactory.create()` and **before** `app.listen()`:

```typescript
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { mountKratos } from '@maxal_studio/kratosjs-nestjs';
import { AppModule } from './app.module';
import { buildAdminPanel } from './panel';

async function bootstrap() {
	// bodyParser:false — let KratosJs own JSON parsing. Its 50mb limit covers
	// base64 media uploads, which Nest's default 100kb parser would otherwise 413.
	const app = await NestFactory.create(AppModule, { bodyParser: false });

	await mountKratos(app, buildAdminPanel());

	await app.listen(3000);
}
bootstrap();
```

Your Nest app keeps `/` and its own controllers; the panel serves its API under
`/kratosjs/api` and (with `.panelPath('/admin')`) the admin UI under `/admin`.

## Building the panel

`buildAdminPanel()` returns an ordinary KratosJs `Panel` — resources, ORM, auth, i18n, media,
all the usual configuration. Two things it must **not** do: don't call `.httpAdapter()` and
don't call `.start()` — `mountKratos()` sets the adapter and runs the mount sequence for you.
Use `.panelPath('/admin')` to keep the admin UI off the domain root so NestJS can own `/`.

```typescript
// panel.ts
import path from 'node:path';
import { Panel, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { User } from './entities/User';
import { Todo } from './entities/Todo';
import { TodoResource } from './resources/TodoResource';
import { UserResource } from './resources/UserResource';

export function buildAdminPanel(): Panel {
	return (
		Panel.make('admin')
			.title('KratosJs on NestJS')
			// UI at /admin — NestJS keeps '/'. Omit to serve the panel from the root.
			.panelPath('/admin')
			.orm(
				{
					driver: SqliteDriver,
					dbName: path.join(process.cwd(), 'app.sqlite'),
					entities: [User, Todo],
				},
				{ migrate: false, updateSchema: true },
			)
			.resources([TodoResource, UserResource])
			.auth({
				jwt: {
					secret: process.env.JWT_SECRET || 'change-me',
					accessTokenExpiry: '15m',
					refreshTokenExpiry: '7d',
				},
				userEntity: User,
				providers: [new EmailAuthProvider()],
			})
		// NO .httpAdapter() and NO .start() — mountKratos() does both.
	);
}
```

Add resources, pages, media adapters, plugins, and i18n exactly as you would in a standalone
KratosJs app — see the [KratosJs docs](https://github.com/maxal-studio/kratosjs).

## How it works

`mountKratos(app, panel)`:

1. Reads the underlying framework instance via `app.getHttpAdapter().getInstance()`.
2. Detects Express vs Fastify and lazily imports the matching KratosJs adapter, constructing
   it over that instance (`new ExpressAdapter({ app })` / `new FastifyAdapter({ app })`).
3. Wraps it in a `NestAdapter` whose `listen()` is a no-op (Nest owns listening) and runs
   `panel.start(0)` — the full mount sequence (routes, admin SPA, ORM, plugins, i18n) with no
   port bound.

Nest then binds the port when you call `app.listen()`.

## Fastify note

On Fastify the panel **API** works out of the box. The admin **SPA fallback** registers a
fastify `setNotFoundHandler`, which can collide with Nest's own not-found handler — so for the
full admin UI prefer Express, or serve the built SPA separately and use
`panel.adminClient(false)`.

On Fastify the body limit is fixed at instance creation, so set it on Nest's
`FastifyAdapter` rather than relying on `bodyParser: false`.

## Demo app

A complete, runnable NestJS + KratosJs demo (Express, SQLite, `Todo`/`User` resources, email
login, admin UI at `/admin`) lives in the KratosJs monorepo under
[`examples/nestjs-app`](https://github.com/maxal-studio/kratosjs/tree/main/examples/nestjs-app):

```bash
git clone https://github.com/maxal-studio/kratosjs
cd kratosjs/examples/nestjs-app
npm install
npm run dev
```

Then open http://localhost:3000/ (the Nest app) and http://localhost:3000/admin (the panel —
log in with `admin@example.com` / `password`).
