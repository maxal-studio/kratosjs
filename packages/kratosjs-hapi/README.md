# @maxal_studio/kratosjs-hapi

Hapi HTTP adapter for [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels.

KratosJs core is HTTP-framework agnostic — an adapter package wires it to a concrete
framework. Scaffold a Hapi app directly with `kratosjs new my-app --http hapi`.

## Install

```bash
npm install @maxal_studio/kratosjs-hapi
```

## Usage

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { HapiAdapter } from '@maxal_studio/kratosjs-hapi';

const panel = Panel.make('admin').httpAdapter(new HapiAdapter());
// ... resources, auth, orm ...

await panel.start(3000);
```

### Custom routes stay framework-neutral

The same handler code runs on the express, fastify, and hapi adapters:

```typescript
panel.registerRoute('get', '/greet', (req, reply) => {
	reply.json({ hello: (req.query.name as string) || 'there' });
});
```

### Body limit

Hapi fixes the payload limit at server creation, so configure it on the adapter
(not via `panel.http({ bodyLimit })`):

```typescript
panel.httpAdapter(new HapiAdapter({ bodyLimit: '100mb' }));
```

### Escape hatch: the raw Hapi server

```typescript
import { getHapiApp } from '@maxal_studio/kratosjs-hapi';

const server = getHapiApp(panel); // or panel.getServer<Server>()
server.route({ method: 'GET', path: '/raw', handler: () => ({ raw: 'hapi' }) });
```

Register raw routes **before** `panel.start()` — Hapi forbids adding routes after the
server starts, and the admin SPA fallback is wired last.

### Mount onto an existing Hapi server

```typescript
import Hapi from '@hapi/hapi';

const server = Hapi.server({ routes: { payload: { maxBytes: 50 * 1024 * 1024 } } });
panel.httpAdapter(new HapiAdapter({ app: server }));
```

CORS and the payload limit are then the host server's responsibility.
