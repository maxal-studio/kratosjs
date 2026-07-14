# @maxal_studio/kratosjs-cli

Command-line interface for scaffolding [KratosJs](https://kratosjs.com) apps and plugins.

## Scaffold an app

```bash
npx @maxal_studio/kratosjs-cli new
```

The wizard asks for a project name, a database driver (MySQL, PostgreSQL, SQLite,
MariaDB, or MongoDB), and an HTTP framework (Express, Fastify, Hapi, or Koa), then
generates a ready-to-run full-stack app:

```bash
cd my-app
cp .env.example .env   # set your database credentials
npm run dev
```

The generated app is **full-stack** out of the box:

- The **admin panel** is served at `/admin` (`panel.panelPath('/admin')`).
- A **server-rendered front page** (SSR Views) is served at `/` — see
  `src/views/pages/Home.tsx` and the shared `src/views/Layout.tsx` (title, description,
  keywords, and favicon defaults live there).
- Plugins are **auto-wired** on the client via `virtual:kratos-client` — you never edit
  `src/admin/main.tsx` to add one.

Flags: `--driver <driver>`, `--http <adapter>`, `--no-install`, `--local` (use `file:`
links to a local monorepo checkout).

Build for production with `npm run build` (compiles the server, the admin bundle, and the
views bundle) and run with `npm start`.

## Scaffold a plugin

```bash
# server + React client (the default)
npx @maxal_studio/kratosjs-cli plugin my-plugin

# server-only (no React UI)
npx @maxal_studio/kratosjs-cli plugin my-plugin --no-client
```

A plugin is a standalone npm package. By default it ships **both halves**:

- **Server** (`.` export) — a `Plugin` class whose `register(panel)` can add entities,
  migrations, resources, admin pages, routes, hooks, and public SSR view routes.
- **Client** (`./client` export) — a `definePluginClient` manifest that contributes React
  to the panel: custom `fields` / `columns` / `widgets` / `blocks`, UI `slots`, and SSR
  view `pages`. The scaffold includes a sample custom field and a sample slot component
  (rendered under a record's details).

`@maxal_studio/kratosjs-react`, `react`, and `react-dom` are added as devDependencies so
the client builds immediately. The generated `package.json` declares
`"kratosjs": { "client": "kratosjs-plugin-my-plugin/client" }`, so the app's
`virtual:kratos-client` module **auto-imports** the manifest — installing the plugin is
enough; no entry-file edits.

```bash
cd kratosjs-plugin-my-plugin
npm install
npm run build
```

See the [plugin docs](https://docs.kratosjs.com/plugins/creating-plugins) for the full
authoring guide.

## Documentation

- Website: <https://kratosjs.com>
- Docs: <https://docs.kratosjs.com>
