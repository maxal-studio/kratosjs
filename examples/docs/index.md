---
layout: home

hero:
    name: KratosJs
    text: The full-stack TypeScript framework
    tagline: Build a server-rendered React front end and a dynamic admin panel from one Node.js backend. Define resources, forms, and tables once — and ship SEO-ready public pages with Inertia-style SSR.
    image:
        src: /icon.png
        alt: KratosJs
    actions:
        - theme: brand
          text: Get Started
          link: /getting-started
        - theme: alt
          text: Build with AI
          link: /build-with-ai
        - theme: alt
          text: View on Github
          link: https://github.com/maxal-studio/kratosjs

features:
    - title: Build with AI
      details: Install the KratosJs Agent Skill into Claude Code, Cursor, Copilot, Codex, and 40+ tools — then describe the panel you want and let your assistant generate it.
      link: /build-with-ai
    - title: Fluent TypeScript API
      details: Define resources, forms, and tables with a clean, chainable API. Full autocompletion and compile-time safety out of the box.
    - title: React Frontend
      details: A dedicated React package renders your backend-defined schemas dynamically — no hand-written CRUD screens.
    - title: Server-Rendered Views (SSR)
      details: An Inertia-style, React-only SSR layer for public, SEO-ready pages. Route handlers return `reply.view(component, props)`; data flows from the server, not a separate API.
    - title: MikroORM Support
      details: One adapter for MySQL, PostgreSQL, SQLite, MariaDB, and MongoDB. Swap databases without rewriting your resources.
    - title: Authentication & Permissions
      details: Built-in email auth, OAuth, and granular access control. Protect resources and actions with declarative policies.
    - title: Shared Validation Engine
      details: Rules declared on fields run on both client and server with the same isomorphic engine — no drift, and no way to bypass them via the API.
    - title: Plugin System
      details: Extend with plugins that register entities, migrations, resources, pages, routes, and lifecycle hooks.
    - title: Media Management
      details: Integrated file uploads with local and S3 storage backends. Attach media to any resource field.
---
