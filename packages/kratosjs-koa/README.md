# @maxal_studio/kratosjs-koa

Koa HTTP adapter for [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels.

KratosJs core is HTTP-framework agnostic — an adapter package wires it to a concrete
framework. Scaffold a Koa app directly with `kratosjs new my-app --http koa`.

## Install

```bash
npm install @maxal_studio/kratosjs-koa
```

## Usage

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { KoaAdapter } from '@maxal_studio/kratosjs-koa';

const panel = Panel.make('admin').httpAdapter(new KoaAdapter());
// ... resources, auth, orm ...

await panel.start(3000);
```

### Custom routes stay framework-neutral

The same handler code runs on the express, fastify, hapi, and koa adapters:

```typescript
panel.registerRoute('get', '/greet', (req, reply) => {
	reply.json({ hello: (req.query.name as string) || 'there' });
});
```

### Escape hatch: the raw Koa app

```typescript
import { getKoaApp } from '@maxal_studio/kratosjs-koa';

const app = getKoaApp(panel); // or panel.getServer<Koa>()
app.use(async (ctx, next) => {
	if (ctx.path === '/raw') {
		ctx.body = { raw: 'koa' };
		return;
	}
	await next();
});
```

Add middleware **before** `panel.start()` — the adapter assembles its own stack (body
parser, CORS, router, admin SPA) when the server starts, and yours runs ahead of it.
Koa has no built-in router; bring your own `@koa/router` for raw path-param routes.

### Mount onto an existing Koa app

```typescript
import Koa from 'koa';

const app = new Koa();
panel.httpAdapter(new KoaAdapter({ app }));
```
