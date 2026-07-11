---
title: Writing an HTTP Adapter
---

# Writing an HTTP Adapter

An adapter connects KratosJs to an HTTP framework. Because core composes the entire
request pipeline itself, an adapter is a thin translation layer — the Express adapter is
~150 lines. This guide walks through the contract; use
`@maxal_studio/kratosjs-express` and core's `InMemoryHttpAdapter` (bare `node:http`) as
reference implementations.

## The contract

```typescript
import { KratosHttpAdapter } from '@maxal_studio/kratosjs';
import type { AdapterInitContext, AdminSpaService, RouteDefinition, StaticMount } from '@maxal_studio/kratosjs';

export class MyAdapter extends KratosHttpAdapter {
	readonly name = 'my-framework';

	init(ctx: AdapterInitContext): void | Promise<void> {}
	registerRoute(route: RouteDefinition): void {}
	useStatic(mount: StaticMount): void {}
	serveAdminSpa(spa: AdminSpaService): void | Promise<void> {}
	listen(port: number, callback?: () => void): Promise<void> {}
	getPort(): number {}
	close(): Promise<void> {}
	getNative<T = unknown>(): T {}
}
```

The panel drives it in a fixed order during `start()`:

```text
init(ctx) → useStatic(...) per mount → registerRoute(...) per route
        → serveAdminSpa(spa) → listen(port)
```

### `init(ctx)`

Create the native app. Install JSON body parsing honoring `ctx.bodyLimit` (uploads travel
as base64 JSON — the default is 50mb) and CORS per `ctx.cors`
(`{ origin, credentials } | false`). Do **not** install cookie parsing — core parses the
`Cookie` header itself. `ctx.panelPath` is the admin UI mount path (default `'/'`) — used
in `serveAdminSpa` to scope the SPA.

### `registerRoute(route)`

Map one `RouteDefinition` onto the native router:

- `route.method` — uppercase (`'GET'`, `'POST'`, ...)
- `route.path` — absolute, already prefixed with the panel base path; the pattern language
  is `':name'` segments only (no regexes or wildcards), which Express 5, Fastify, and most
  routers support natively
- `route.handler` — **one** fully composed function; auth, ORM/request context, and error
  handling are already inside it

Routes are registered in table order and the adapter MUST preserve that order as match
precedence (first match wins).

Per request, build the neutral request/reply and invoke the handler:

```typescript
import { buildKratosRequest, createReply, type ReplyDriver } from '@maxal_studio/kratosjs';

nativeRouter[method](route.path, async (nativeReq, nativeRes) => {
	const req = buildKratosRequest({
		method: nativeReq.method,
		url: nativeReq.url, // path INCLUDING query string
		protocol, // honor x-forwarded-proto when present
		host: nativeReq.headers.host,
		ip: nativeReq.socket?.remoteAddress,
		params: nativeReq.params,
		query: nativeReq.query,
		body: nativeReq.body,
		headers: nativeReq.headers,
		raw: nativeReq,
		panel: this.panel, // from init(ctx)
	});
	const reply = createReply(new MyReplyDriver(nativeRes));
	await route.handler(req, reply);
});
```

`buildKratosRequest` derives everything else (cookie parsing, case-insensitive header
lookup, media helpers). The `ReplyDriver` is the only response surface you implement:

```typescript
class MyReplyDriver implements ReplyDriver {
	constructor(private res: NativeResponse) {}
	get raw() {
		return this.res;
	}
	setStatus(code: number) {}
	setHeader(name: string, value: string) {}
	appendHeader(name: string, value: string) {} // multiple Set-Cookie headers!
	sendBody(body: string | Buffer) {} // terminal: write + end
}
```

Core implements the full `KratosReply` on top (JSON content types, redirects, RFC 6265
cookie serialization, double-send protection) — so those behave byte-identically on every
adapter.

### `useStatic(mount)`

Serve `mount.directory` at `mount.urlPath` (e.g. `express.static`). Guard against path
traversal if your framework doesn't.

### `serveAdminSpa(spa)`

Wire the admin SPA **after** all routes, so API routes win. The SPA is scoped to the panel
path (`ctx.panelPath`, default `'/'`): gate the fallback on
`spa.shouldFallback(method, pathname)` and serve prod assets from the panel-path-stripped
path (`spa.assetRelativePath(pathname)`). Paths outside the panel path must fall through
(404), which is what frees `/` for the app's own routes.

- **Production** (`spa.mode === 'production'`): serve `spa.adminDistDir` assets under the
  panel path (using `spa.assetRelativePath(pathname)` to map `/admin/assets/x` →
  `assets/x`), then a catch-all for `spa.shouldFallback(method, pathname)` (GET/HEAD)
  requests sending `spa.getIndexHtml()` as HTML.
- **Development**: `const dev = await spa.createDevServer()` returns Vite in middleware
  mode — `dev.middlewares` is a standard connect-style middleware (Express: `app.use(dev.middlewares)`;
  Fastify: via `@fastify/middie`), then a GET/HEAD catch-all sending
  `await dev.renderIndexHtml(originalUrl)`.
  **Gotcha:** when the panel path is non-root, Vite's base middleware **strips the panel
  path from the raw request URL** before your fallback runs. Scope the dev fallback against
  the _original_ pathname (Express `req.originalUrl`, Koa `ctx.originalUrl`, or a snapshot
  taken before Vite runs), not the framework's post-middleware URL.

All panel-specific HTML transformation (title, favicon, the injected
`window.__VALAJS_API_BASE_PATH__` / `window.__VALAJS_PANEL_PATH__` / `window.__VALAJS_I18N__`
globals the React client boots from) happens inside the service — never reimplement it.

### `listen` / `getPort` / `close` / `getNative`

`listen(0)` must work and `getPort()` must return the OS-assigned port (the contract test
suite relies on it). `close()` also closes the SPA dev server if one was created.
`getNative()` returns the framework app for user escape hatches.

## Validating with the contract test suite

Core exports the same test suite that the Express adapter and the in-memory reference
adapter run. If your adapter passes it, KratosJs runs on it:

```typescript
// test/contract.test.ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runHttpAdapterContractSuite } from '@maxal_studio/kratosjs/testing';
import { MyAdapter } from '../src';

runHttpAdapterContractSuite({
	name: 'MyAdapter',
	createAdapter: () => new MyAdapter(),
	test: { describe, it, expect, beforeAll, afterAll },
});
```

The suite pins: request field mapping (params/query/body/headers/cookies/ip/protocol),
reply semantics (status/headers/JSON/binary/HTML/redirects), exact cookie serialization
(including the refresh-token path scoping), error mapping, route-order precedence, static
mounts, CORS, multi-megabyte JSON bodies, and production SPA serving.

## Packaging conventions

- Name: `kratosjs-<framework>` (scoped or not)
- `peerDependencies`: `@maxal_studio/kratosjs` (the major you support)
- Export the adapter class plus a typed `get<Framework>App(panel)` helper
- Don't make the adapter a Plugin — plugins run _during_ `start()`, while the adapter is
  what `start()` orchestrates. It has its own dedicated `panel.httpAdapter()` slot.
