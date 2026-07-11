# KratosJs on NestJS — demo

A NestJS (Express) app with a KratosJs admin panel mounted onto it via
[`@maxal_studio/kratosjs-nestjs`](../../packages/kratosjs-nestjs). One server, three surfaces:

| Path              | Served by                     |
| ----------------- | ----------------------------- |
| `/`               | a NestJS controller (landing) |
| `/admin`          | the KratosJs admin UI         |
| `/kratosjs/api/*` | the panel API                 |

The panel lives at `/admin` (`panel.panelPath('/admin')`), so NestJS keeps ownership of `/`.

## Run (development)

```bash
npm run dev
```

Then open:

- http://localhost:3000/ — the Nest landing page
- http://localhost:3000/admin — the admin panel (login **admin@example.com / password**)

Uses SQLite (`nestjs-demo.sqlite`, auto-created), so there's nothing else to set up.

## Run (production build)

```bash
npm run build      # tsc (server) + vite build (admin client)
npm start          # NODE_ENV=production
```

## The wiring

See [`src/main.ts`](./src/main.ts): after `NestFactory.create(AppModule, { bodyParser: false })`,
call `await mountKratos(app, buildAdminPanel())`, then `await app.listen(3000)`. The panel in
[`src/panel/panel.ts`](./src/panel/panel.ts) sets no `.httpAdapter()` and calls no `.start()` —
`mountKratos` does both.
