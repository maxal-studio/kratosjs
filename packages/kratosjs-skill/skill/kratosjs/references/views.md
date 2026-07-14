# Views — Inertia-style SSR public pages (v3)

Views are a **public-site layer**, independent of the admin SPA: server-rendered,
SEO-ready React pages (landing pages, marketing sites, CMS front-ends) at top-level
paths. First visit → SSR HTML; client navigation → JSON page object (no reload).

## Register (views are on by default)

Views are **enabled by default** — no `.views()` call needed. The machinery activates
when the app has the views client present (dev: `views.html` + `src/views/*`; prod:
`dist/views` build), so API-only apps pay nothing. Call `panel.views(config)` only to
configure (`loginPath`/`assetsBase`/`csrf`/`version`) or force dev scaffolding;
`panel.views(false)` disables it.

```typescript
import { adminRoute, viewAuth, csrfProtection } from '@maxal_studio/kratosjs';

// A route handler returns reply.view(component, props).
panel.route('get', '/', (req, reply) => reply.view('Home', { title: 'Welcome' }));
panel.route('get', '/posts/:slug', async (req, reply) => {
	const post = await panel.getEm().findOne(Post, { slug: req.params.slug });
	if (!post) return reply.status(404).html('Not found');
	reply.view('blog/Show', { post });
});
```

## `panel.route()` — the ONE route primitive (replaces `registerRoute`)

`panel.route(method, path, ...handlers)` registers a **bare, top-level, public** route.
No base-path prefix, no auth. Every handler gets a view-capable reply
(`reply.view` / `reply.json` / `reply.html` / `reply.back`). All-but-last handlers are
middleware. Opt into cross-cutting concerns with exported middleware:

- `adminRoute(panel)` — makes it an admin/API route: prefixes `basePath` + requires auth.
- `requireAuth(panel)` / `optionalAuth(panel)` — auth without prefixing.
- `viewAuth(panel)` — protected page: browser → 302 to `loginPath`, view-XHR → 409.
- `csrfProtection(panel)` — CSRF check on non-GET (Views client sends the token).

`registerRoute(...)` is **deprecated** = `route(m, p, adminRoute(panel), ...h)`.

## Client (kratosjs-react `/views` + `/server`)

App owns `views.html` (shell with `<!--kratos-head-->`, `<!--kratos-app-->`,
`<!--kratos-page-->`), `src/views/entry-client.tsx` (`hydrateViewsApp`),
`entry-server.tsx` (`createServerRenderer`), and `src/views/pages/**/*.tsx` (auto-keyed
by path, e.g. `blog/Show`). In dev these auto-scaffold. Page components use:

```tsx
import { Head, Link, usePage, useForm } from '@maxal_studio/kratosjs-react/views';
export default function Show() {
	const { props } = usePage<{ post: Post }>();
	return (
		<article>
			<Head>
				<title>{props.post.title}</title>
			</Head>
			{/* ... */}
		</article>
	);
}
```

- `usePage()` / `useViewProps()` — current page/props.
- `<Link href method data only>` — client-side navigation (no reload).
- `router.visit/get/post/reload({ only })` — programmatic; `reload({ only: ['x'] })` refetches named props only (partial reload).
- `useForm(initial)` — `data/setData/errors/processing/post(url)`; server 422 errors land in `errors`.
- `<Head>` — title/meta/link, SSR-serialized + client-synced.
- Shared props (every page): `{ auth: { user }, locale, csrf }` — add more with `panel.viewShare(fn)`.
- `lazyProp(fn)` (core) — a prop evaluated only when named in a partial reload.

## Layouts (shared top menu / footer)

A layout wraps every page. Define a component taking `{ children }` and pass it as
`layout` to BOTH entry files (must match or hydration breaks):

```tsx
// entry-server.tsx / entry-client.tsx
import Layout from './Layout';
createServerRenderer({ pages, plugins: pluginClients, layout: Layout }); // server
hydrateViewsApp({ pages, plugins: pluginClients, layout: Layout }); // client
```

Pages then render as `<Layout><Page/></Layout>`. The layout instance PERSISTS across
client-side navigation (menu/scroll state survive — only the page swaps). A page's
static `layout` property overrides the global one: `Login.layout = AuthLayout`.
Resolution: page static `layout` → entry-file `layout` → unwrapped.

## Plugins

A plugin registers view routes in `register()` and ships page components in its
client manifest `pages` (namespaced `pluginName::Key` at render):

```typescript
// client: definePluginClient({ name: 'blog', pages: { 'Post/Show': PostShow } })
// server: panel.route('get', '/posts/:slug', (req, reply) => reply.view('blog::Post/Show', { post }))
```

## Build & deploy

`vite.views.config.mts` → `defineConfig(kratosViewsVite())`. Build script:

```
"build:views": "vite build -c vite.views.config.mts && vite build -c vite.views.config.mts --ssr src/views/entry-server.tsx"
```

Outputs `dist/views/client` (browser bundle + `views.html` + manifest) and
`dist/views/server/entry-server.js` (SSR). Prod (`NODE_ENV=production`) needs both.
Assets served at `/views/assets` (configurable via `views({ assetsBase })`).

## Gotchas

- `--ssr` alone does NOT set Vite's `isSsrBuild`; pass the entry: `--ssr src/views/entry-server.tsx`.
- App `pages` come from `import.meta.glob('./pages/**/*.tsx')` (loaders); plugin `pages`
  are directly-imported components.
- Render from props only (avoid `Date.now()`/locale drift) to prevent hydration mismatch.
- The core package never imports React — SSR runs inside the app's Vite-built bundle.
