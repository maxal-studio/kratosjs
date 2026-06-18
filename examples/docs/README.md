# KratosJs Documentation

This directory contains the VitePress documentation site for KratosJs.

## Structure

Documentation is split across the monorepo:

- **`../../docs/`** — Database, Resources, Pages, Forms, Tables, Authentication, Media (symlinked here)
- **`../../packages/kratosjs-react/docs/`** — Getting Started (symlinked as `getting-started.md`)
- **`./plugins/`** — Plugin authoring guides
- **`./backend-setup.md`** — Example app backend setup

Symlinks in this directory point to package documentation so VitePress can serve it.

## Development

```bash
cd examples/docs
npm install
npm run dev
```

The site runs at `http://localhost:5173/`.

## Building for Production

```bash
npm run build
```

Static output is written to `.vitepress/dist`.
