# Changelog

## 2.0.0 (2026-07-10)

### Pluggable HTTP framework (breaking)

KratosJs core no longer depends on Express. The HTTP layer is a framework-neutral
contract (`KratosHttpAdapter`, `KratosRequest`, `KratosReply`, a declarative route table
with fully composed handlers), and framework adapters are separate packages. Third
parties can now ship Fastify/NestJS/etc. adapters — see the "Writing an Adapter" guide.

**Migration guide:** https://github.com/maxal-studio/kratosjs — `examples/docs/migration-v2.md`
(published on the docs site under _Migrating to v2_).

#### Added

- **`@maxal_studio/kratosjs-express`** — the Express adapter package, installed by default
  by `kratosjs new`. Exports `ExpressAdapter` (with `{ app }` option for mounting onto an
  existing Express app) and the typed `getExpressApp(panel)` escape hatch.
- **`@maxal_studio/kratosjs-fastify`** — the Fastify adapter package. Exports `FastifyAdapter`
  (with `{ app }` and `{ bodyLimit }` options) and `getFastifyApp(panel)`. Passes the same
  contract suite as the Express adapter.
- **`@maxal_studio/kratosjs-hapi`** — the Hapi adapter package. Exports `HapiAdapter`
  (with `{ app }` and `{ bodyLimit }` options) and `getHapiApp(panel)`. Passes the same
  contract suite as the other adapters.
- **`@maxal_studio/kratosjs-koa`** — the Koa adapter package. Exports `KoaAdapter`
  (with `{ app }` option) and `getKoaApp(panel)`. Passes the same contract suite; honors
  `panel.http({ bodyLimit })` normally.
- **`@maxal_studio/kratosjs-nestjs`** — mount a KratosJs panel onto an existing **NestJS**
  app. One package for both Nest platforms: `mountKratos(app, panel)` auto-detects Express
  vs Fastify (via `app.getHttpAdapter().getInstance()`), builds the matching adapter over the
  Nest instance, and runs the panel mount sequence — Nest keeps ownership of `listen()`. Also
  exports `NestAdapter`. See the "NestJS Integration" guide.
- **`kratosjs new --http express|fastify|hapi|koa`** — choose the HTTP framework when
  scaffolding (interactive prompt when omitted; Express is the default).
- **Configurable admin UI path** — `panel.panelPath('/admin')` serves the admin SPA (and
  its assets) under a sub-path, scoped so everything outside it 404s (freeing `/` for your
  own routes). Default `'/'` preserves the domain-root behavior. Independent of the API
  base path (`.path()`). **Backend-only** — no `vite.config` change: `kratosAdminVite()`
  now builds with a relative asset base (`'./'`) and the server drives the Vite base from
  `panelPath` (setting the dev-server base and rewriting the built `index.html`'s asset
  URLs). The React client auto-derives its router basename from an injected
  `window.__VALAJS_PANEL_PATH__`. Adapter contract note: `AdminSpaService.shouldFallback`
  now takes `(method, pathname)` and `AdapterInitContext` gains `panelPath` (relevant for
  third-party adapters).
- **Framework-neutral custom routes**: `panel.registerRoute()` handlers receive
  `KratosRequest` / `KratosReply` and run unchanged on any adapter. New in v2 they also get
  the request context — `getRequestContext()` and server-side `t()` work inside them.
- **`@maxal_studio/kratosjs/testing`** subpath: `InMemoryHttpAdapter` (bare node:http
  reference adapter) and `runHttpAdapterContractSuite` — the compliance test suite every
  adapter must pass.
- `panel.getServer<T>()` (typed native-app escape hatch), `panel.http({ bodyLimit, cors })`,
  `panel.adminClient(false)` (headless/API-only), `panel.stop()`.
- Cookie handling is core-owned: identical Set-Cookie serialization on every adapter
  (cookie-parser and the express `res.cookie` path are gone).
- `x-forwarded-proto` is honored for `req.protocol` on all adapters (v1's Express setup
  ignored it, producing `http://` OAuth redirects behind TLS proxies).

#### Changed (breaking)

- An HTTP adapter is **required**: `panel.httpAdapter(new ExpressAdapter())`. `start()`
  throws a descriptive error without one. `httpAdapter()` now takes an instance, not a class.
- `panel.middleware([...])` takes neutral `(req, reply, next)` middleware (`next()` returns
  a promise) instead of Express `RequestHandler`s.
- `KratosJsRequest` / `KratosJsResponse` / `KratosJsRequestHandler` are deprecated aliases of
  `KratosRequest` / `KratosReply` / `KratosHandler`; the `express-serve-static-core` module
  augmentation is removed.
- `AuthHookContext.req` is a `KratosRequest` (native request available at `req.raw`).
- `AuthManager.getRoutes(): Router` → `AuthManager.getRouteDefinitions()`.
- `panel.getApp()` is deprecated in favor of `getServer<T>()`; raw framework routes must be
  registered **before** `start()` (the admin SPA catch-all is mounted last).
- Removed: `panel.attachAuth()` semantics changed (deprecated alias of `getAuthMiddleware()`),
  `panel.attachMediaHelpers()` (media helpers are built into every request),
  `panel.ormContextMiddleware()` → `ormContextStep()`, the `HttpAdapter` base class
  (replaced by `KratosHttpAdapter`).

#### Removed

- `express`, `cors`, `cookie-parser`, and `vite-express` dependencies from core.
  Dev-mode admin serving now embeds Vite directly in middleware mode (same HMR behavior);
  production serving is unchanged.

#### Unchanged

- All HTTP endpoints, payload shapes, auth cookies, and injected client globals — the React
  admin client (`@maxal_studio/kratosjs-react`) works identically against v1 and v2 backends.
- Resources, forms, tables, hooks, actions, widgets, pages, media, i18n, and plugin APIs
  (except route-handler signatures, above).
