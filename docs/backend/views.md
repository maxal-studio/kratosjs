---
title: Views (SSR)
---

# Views — server-rendered public pages

Views are KratosJs's **public-site layer**: server-rendered, SEO-ready React pages
served straight from your backend, independent of the admin panel. The first browser visit gets full SSR HTML; subsequent navigations
fetch just the page's props as JSON and swap the component client-side, with no full
reload. **Data flows from your route handlers, not a separate REST API.**

## Register a view

Views are **enabled by default** — you don't call anything to turn them on. Just
register a route whose handler returns `reply.view(component, props)`. The SSR machinery
activates automatically once the app has the views client present (the `views.html` +
`src/views/*` files in development, or a `dist/views` build in production), so an
API-only app that never renders a view pays nothing.

```typescript
import { Panel } from '@maxal_studio/kratosjs';

const panel = Panel.make('admin').httpAdapter(new ExpressAdapter()).panelPath('/admin'); // move the admin UI off '/', freeing it for your front end

// A handler returns reply.view(component, props).
panel.route('get', '/', (_req, reply) => reply.view('Home', { title: 'Welcome' }));

panel.route('get', '/posts/:slug', async (req, reply) => {
	const post = await panel.getEm().findOne(Post, { slug: req.params.slug });
	if (!post) return reply.status(404).html('Not found');
	reply.view('blog/Show', { post });
});
```

Call `panel.views(config)` only to **configure** it (`loginPath`, `assetsBase`, `csrf`,
`version`) or to **force** activation (auto-scaffolding the client files in development).
Disable it entirely with `panel.views(false)`.

## `panel.route()` — one route primitive

`panel.route(method, path, ...handlers)` replaces `registerRoute` (still available,
deprecated). It registers a **bare, public, top-level** route whose reply can render a
view. Opt into cross-cutting concerns with exported middleware:

| Middleware              | Effect                                                        |
| ----------------------- | ------------------------------------------------------------- |
| `adminRoute(panel)`     | Prefix the API base path + require auth (an admin/API route). |
| `requireAuth(panel)`    | Require auth (JSON 401), no path prefix.                      |
| `optionalAuth(panel)`   | Attach the user when signed in; never block.                  |
| `viewAuth(panel)`       | Protected page: browser → redirect to login, XHR → 409.       |
| `csrfProtection(panel)` | CSRF check on non-GET (the client sends the token).           |

```typescript
import { viewAuth } from '@maxal_studio/kratosjs';
panel.route('get', '/account', viewAuth(panel), (req, reply) => reply.view('Account', { user: req.authUser }));
```

## Page components

Pages live in `src/views/pages/**/*.tsx`, keyed by path (`blog/Show`). They use the
`@maxal_studio/kratosjs-react/views` runtime:

```tsx
import { Head, Link, usePage, useForm } from '@maxal_studio/kratosjs-react/views';

export default function Show() {
	const { props } = usePage<{ post: Post }>();
	return (
		<article>
			<Head>
				<title>{props.post.title}</title>
				<meta name="description" content={props.post.excerpt} />
			</Head>
			<h1>{props.post.title}</h1>
			<Link href="/">← Home</Link>
		</article>
	);
}
```

- `usePage()` / `useViewProps()` — the current page and its props.
- `<Link href method data only>` — client-side navigation (no reload).
- `router.visit / post / reload({ only: ['x'] })` — programmatic navigation and
  **partial reloads** (refetch only named props).
- `useForm(initial)` — form state + submit; the server's validation errors land in
  `form.errors`.
- `<Head>` — title/meta/link, serialized during SSR and synced on the client.
- **Shared props** on every page: `{ auth: { user }, locale, csrf }`. Add more with
  `panel.viewShare(fn)`. Mark a prop as fetch-on-demand with `lazyProp(fn)`.

## Layouts (shared top menu, footer, chrome)

A layout is a component that wraps every page — the place for your top navigation and
footer. Pass it as `layout` to **both** entry files (they must match, or hydration will
mismatch):

```tsx
// src/views/Layout.tsx
import type { ReactNode } from 'react';
import { Link, usePage } from '@maxal_studio/kratosjs-react/views';

export default function Layout({ children }: { children: ReactNode }) {
	const { props } = usePage<{ auth: { user: { name: string } | null } }>();
	return (
		<div>
			<header>
				<nav>
					<Link href="/">Home</Link>
					<Link href="/blog">Blog</Link>
					{props.auth.user ? <span>{props.auth.user.name}</span> : <Link href="/login">Sign in</Link>}
				</nav>
			</header>
			<main>{children}</main>
			<footer>
				<Link href="/privacy">Privacy</Link>
				<span>© {new Date().getFullYear()} Your Company</span>
			</footer>
		</div>
	);
}
```

```tsx
// entry-server.tsx
import Layout from './Layout';
export const render = createServerRenderer({ pages, plugins: pluginClients, layout: Layout });

// entry-client.tsx
import Layout from './Layout';
hydrateViewsApp({ pages, plugins: pluginClients, layout: Layout });
```

Every page now renders as `<Layout><Page /></Layout>` — no per-page wiring.

- **Persistent layout.** On client-side navigation the router swaps only the page inside
  the same `Layout` instance, so the header/footer never remount — menu state, scroll
  position, and open dropdowns survive between pages.
- **Per-page override.** A page's static `layout` property wins over the global one
  (e.g. a bare screen for `/login`):

    ```tsx
    import AuthLayout from '../AuthLayout';
    export default function Login() {
    	/* ... */
    }
    Login.layout = AuthLayout;
    ```

    Resolution order: the page's static `layout` → the entry-file `layout` → unwrapped.

## Public metadata (SEO)

Declare site-wide public info once with `panel.publicMetadata(...)`, then build per-page
SEO from it. The common SEO fields — `title`, `description`, `keywords` — are first-class
(typed as `PublicMetadata`; extra fields allowed). **`title` defaults to the panel title
(`.title(...)`)** when omitted. Pass an object, or a function of the request for
per-locale / per-tenant values:

```typescript
panel
	.title('Acme') // used as the default publicMetadata.title
	.publicMetadata({
		description: 'We make things',
		keywords: 'acme, widgets',
		// title omitted → falls back to 'Acme'
	});
```

Once configured, the resolved metadata is **auto-populated on `req.publicMetadata`** for
every `panel.route(...)` handler — no middleware to attach — so you can compose per-page
titles/descriptions right in the handler:

```typescript
panel.route('get', '/posts', (req, reply) =>
	reply.view('blog/Index', {
		posts,
		title: `${req.publicMetadata?.title} — Blog`,
		description: req.publicMetadata?.description,
	}),
);
```

Outside a route (or from anywhere with the panel), resolve it directly with
`await panel.resolvePublicMetadata(req)`. It is **also a shared prop** on every view, so
page components (or your `Layout`'s `<Head>`) can read it without the handler passing it:

```tsx
const { publicMetadata } = usePage<{ publicMetadata: { title: string } }>().props;
```

## Build and deploy

Your app owns a `vite.views.config.mts`:

```typescript
import { defineConfig } from 'vite';
import { kratosViewsVite } from '@maxal_studio/kratosjs/vite';
export default defineConfig(kratosViewsVite());
```

and a build script:

```json
"build:views": "vite build -c vite.views.config.mts && vite build -c vite.views.config.mts --ssr src/views/entry-server.tsx"
```

This emits `dist/views/client` (browser bundle, HTML shell, manifest) and
`dist/views/server` (the SSR entry). In development the server auto-scaffolds the
client files and renders through Vite; in production (`NODE_ENV=production`) both build
outputs must exist. Built assets are served at `/views/assets` (configurable via
`views({ assetsBase })`).

## Plugins

A plugin registers view routes in `register()` and ships page components in its client
manifest `pages` (namespaced `pluginName::Key`):

```typescript
// client manifest: definePluginClient({ name: 'blog', pages: { 'Post/Show': PostShow } })
// server register():  panel.route('get', '/posts/:slug', (req, reply) =>
//                       reply.view('blog::Post/Show', { post }))
```

## Notes

- The core package never imports React — SSR runs inside your app's Vite-built bundle
  (which imports `@maxal_studio/kratosjs-react/server`).
- Render from props only (avoid `Date.now()` / locale drift in markup) to keep
  hydration stable.
- `vite build --ssr` needs the entry: pass `--ssr src/views/entry-server.tsx`.
