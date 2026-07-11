# @maxal_studio/kratosjs-fastify

Fastify HTTP adapter for [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels.

KratosJs core is HTTP-framework agnostic — an adapter package wires it to a concrete
framework. Scaffold a Fastify app directly with `kratosjs new my-app --http fastify`.

## Install

```bash
npm install @maxal_studio/kratosjs-fastify
```

## Usage

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { FastifyAdapter } from '@maxal_studio/kratosjs-fastify';

const panel = Panel.make('admin').httpAdapter(new FastifyAdapter());
// ... resources, auth, orm ...

await panel.start(3000);
```

### Custom routes stay framework-neutral

The same handler code runs on the express and fastify adapters:

```typescript
panel.registerRoute('get', '/greet', (req, reply) => {
	reply.json({ hello: (req.query.name as string) || 'there' });
});
```

### Body limit

Fastify fixes the body size limit at instance creation, so configure it on the adapter
(not via `panel.http({ bodyLimit })`):

```typescript
panel.httpAdapter(new FastifyAdapter({ bodyLimit: '100mb' }));
```

### Escape hatch: the raw Fastify instance

```typescript
import { getFastifyApp } from '@maxal_studio/kratosjs-fastify';

const app = getFastifyApp(panel); // or panel.getServer<FastifyInstance>()
app.get('/raw', async () => ({ raw: 'fastify' }));
```

Register raw routes **before** `panel.start()` — fastify forbids adding routes after
listen, and the admin SPA fallback is wired last.

### Mount onto an existing Fastify instance

```typescript
import fastify from 'fastify';

const app = fastify({ bodyLimit: 50 * 1024 * 1024 });
panel.httpAdapter(new FastifyAdapter({ app }));
```

CORS and the body limit are then the host app's responsibility.
