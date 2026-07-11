# @maxal_studio/kratosjs-express

Express HTTP adapter for [KratosJs](https://github.com/maxal-studio/kratosjs) admin panels.

KratosJs core is HTTP-framework agnostic — an adapter package wires it to a concrete
framework. This is the default adapter, installed automatically by `kratosjs new`.

## Install

```bash
npm install @maxal_studio/kratosjs-express
```

## Usage

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { ExpressAdapter } from '@maxal_studio/kratosjs-express';

const panel = Panel.make('admin').httpAdapter(new ExpressAdapter());
// ... resources, auth, orm ...

await panel.start(3000);
```

### Custom routes stay framework-neutral

```typescript
panel.registerRoute('get', '/greet', (req, reply) => {
	reply.json({ hello: (req.query.name as string) || 'there' });
});
```

### Escape hatch: the raw Express app

```typescript
import { getExpressApp } from '@maxal_studio/kratosjs-express';

const app = getExpressApp(panel); // or panel.getServer<Express>()
app.get('/raw', (req, res) => res.send('raw express route'));
```

### Mount onto an existing Express app

```typescript
import express from 'express';

const app = express();
panel.httpAdapter(new ExpressAdapter({ app }));
```
