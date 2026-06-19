---
title: Getting Started
---

# Getting Started

Create a production-shaped KratosJs app in one command — server entry, `User` entity + `UserResource`, a seeded demo admin user, and the admin client, for the database you choose.

## Quick Start

```bash
npx @maxal_studio/kratosjs-cli new
```

This runs an interactive wizard (project name + database driver). You can also pass everything up front:

```bash
# Pick a driver directly (mysql | postgresql | mariadb | sqlite | mongo)
npx @maxal_studio/kratosjs-cli new my-app --driver sqlite
```

Then:

```bash
cd my-app
cp .env.example .env   # adjust database settings
npm run dev
```

Open the printed URL and sign in with **admin@example.com** / **password** (seeded automatically on first boot).

### What gets generated

| Path                             | Purpose                                                    |
| -------------------------------- | ---------------------------------------------------------- |
| `src/index.ts`                   | Panel, ORM config, auth, server bootstrap                  |
| `src/entities/User.ts`           | MikroORM entity (driver-specific primary key)              |
| `src/resources/UserResource.ts`  | Admin resource — form + table for users                    |
| `src/seedAdminUser.ts`           | Seeds the demo admin on first boot                         |
| `src/admin/main.tsx`             | Admin client entry — register plugin client manifests here |
| `index.html` + `vite.config.mts` | Admin client build (required for dev + production)         |
| `.env.example`                   | Database + JWT settings for your chosen driver             |

The database schema is created on first boot via `updateSchema: true`. A `src/migrations/` folder is included when you are ready for versioned migrations.

## Next Steps

- [Database & MikroORM](/database/overview) — SQL and MongoDB setup
- [Creating Resources](/resources/overview) — build complete resources
- [Form Fields](/forms/overview) — all available field types
- [Authentication](/authentication/overview) — JWT and providers
- [Creating Plugins](/plugins/creating-plugins) — scaffold and build custom plugins

For full working examples, see `examples/app/` (MongoDB) and `examples/sql-app/` (MySQL with plugins) in the monorepo.

<details>
<summary><strong>Manual setup guide</strong> — wire up an app by hand without the CLI</summary>

### Installation

#### Backend

```bash
npm install @maxal_studio/kratosjs @mikro-orm/core @mikro-orm/mongodb
```

Express, CORS, and cookie-parser are automatically managed by Panel.

#### Frontend

The admin UI is bundled by your app. Install the React package and Vite (dev dependency):

```bash
npm install @maxal_studio/kratosjs-react react react-dom react-hook-form
npm install -D vite typescript tsx
```

If you use plugins with custom fields, columns, widgets, or blocks, also install those plugin packages and import their `/client` manifests in your admin entry (see step 4 below).

### Project Structure

Every KratosJs app has the same layout — two entry points plus three admin client files:

```text
my-app/
├── index.html              # admin HTML template (required for dev + production)
├── vite.config.mts         # Vite config via kratosAdminVite() factory
├── package.json            # dev / build:server / build:admin / start scripts
├── tsconfig.json           # server build; exclude **/*.tsx (admin is built by Vite)
└── src/
    ├── index.ts            # server: Panel, ORM, plugins, auth, panel.start()
    ├── admin/
    │   └── main.tsx        # client: mountAdminPanel({ plugins: [...] })
    ├── entities/
    └── resources/
```

| Entry                | Purpose                                                                            |
| -------------------- | ---------------------------------------------------------------------------------- |
| `src/index.ts`       | Backend server — configures the panel, registers plugins/resources, starts Express |
| `src/admin/main.tsx` | Admin client — mounts the React panel and bundles plugin UI components             |
| `index.html`         | Admin HTML template — required for dev and production                              |
| `vite.config.mts`    | Vite config — uses `kratosAdminVite()` from `@maxal_studio/kratosjs/vite`          |

These three admin client files are **always required**. Every app uses the same structure whether or not you use plugins.

#### Scaffolding the admin client

Create the three files manually, or let the CLI create them for you:

```bash
npx @maxal_studio/kratosjs-cli init
```

This writes `index.html`, `vite.config.mts`, and `src/admin/main.tsx` (only if missing — never overwrites existing files).

On first `panel.start()` in development, KratosJs also auto-scaffolds any missing admin client files and logs what it created.

See `examples/sql-app/` and `examples/app/` for complete reference implementations.

### Panel Configuration

#### 1. Create the Server Entry

Create `src/index.ts` and set up your panel:

```typescript
import path from 'path';
import { Panel, LocalMediaAdapter, EmailAuthProvider } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';

const PORT = 3001;

const adminPanel = Panel.make('admin')
	.title('My Admin')
	.icon('LayoutDashboard')
	.favicon('/assets/logo.png')
	.orm(
		{
			driver: MongoDriver,
			clientUrl: 'mongodb://localhost:27017',
			dbName: 'kratosjs',
		},
		{ updateSchema: true },
	)
	.mediaAdapters([
		new LocalMediaAdapter({
			name: 'local-uploads',
			uploadPath: path.join(process.cwd(), 'uploads'),
			publicUrl: `http://localhost:${PORT}/uploads`,
			createDirectories: true,
			isDefault: true,
		}),
	])
	.resources([UserResource]);

adminPanel.auth({
	jwt: {
		secret: process.env.JWT_SECRET || 'your-secret-key',
		accessTokenExpiry: '15m',
		refreshTokenExpiry: '7d',
	},
	providers: [
		new EmailAuthProvider({
			label: 'Sign in with Email',
			validateCredentials: async (email, password) => {
				const em = adminPanel.getEm();
				const user = await em.findOne('User', { email: email.toLowerCase() });
				if (!user || user.password !== password) return null;
				return { _id: user.id, email: user.email, name: user.name };
			},
		}),
	],
	getUserById: async id => {
		const em = adminPanel.getEm();
		const user = await em.findOne('User', { id });
		return user ? { id: user.id, email: user.email, name: user.name } : null;
	},
});

await adminPanel.start(PORT);
```

**What Panel automatically handles:**

- **Express app creation**: No need to manually create `express()`
- **MikroORM initialization**: Entities from resources and plugins are collected automatically
- **Default middlewares**: CORS, cookie parser, and JSON body parser
- **Static file serving**: LocalMediaAdapter registers static routes from `publicUrl`
- **Route mounting**: All panel routes are mounted at the base path

**Panel branding:** `title()`, `icon()` (Lucide icon name), and `favicon()` (image URL) configure the admin header and login screen. Values are returned by `GET /meta` and the favicon is injected into the production HTML shell.

#### 2. Create a Resource

```typescript
// src/resources/UserResource.ts
import { BaseResource, FormBuilder, TextInput, TableBuilder, TextColumn } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label('Name').required(),
			TextInput.make('email').label('Email').email().required(),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('name').label('Name').sortable(),
			TextColumn.make('email').label('Email').sortable(),
		]);
	}
}
```

#### 3. Define the Entity

```typescript
// src/entities/User.ts
import { EntitySchema } from '@mikro-orm/core';

export interface IUser {
	id: string;
	name: string;
	email: string;
}

export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		name: { type: 'string' },
		email: { type: 'string' },
	} as any,
});
```

#### 4. Create the Admin Client Entry

Run `npx @maxal_studio/kratosjs-cli init` to scaffold the three standard files, or create them manually. Import every plugin `/client` manifest whose custom components you use:

```typescript
// src/admin/main.tsx
import { mountAdminPanel } from '@maxal_studio/kratosjs-react';
import '@maxal_studio/kratosjs-react/styles.css';

// Import plugin client manifests (one per plugin with custom UI)
// import starRating from '@maxal_studio/kratosjs-plugin-star-rating/client';

mountAdminPanel({
	plugins: [
		// starRating,
	],
});
```

```html
<!-- index.html (app root) -->
<!doctype html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<!-- VALAJS_PANEL_FAVICON -->
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<!-- VALAJS_PANEL_TITLE -->
		<!-- VALAJS_PANEL_SETTINGS -->
	</head>
	<body>
		<div id="root"></div>
		<script type="module" src="/src/admin/main.tsx"></script>
	</body>
</html>
```

```typescript
// vite.config.mts
import { defineConfig } from 'vite';
import { kratosAdminVite } from '@maxal_studio/kratosjs/vite';

export default defineConfig(kratosAdminVite());
```

Add scripts to `package.json`:

```json
{
	"scripts": {
		"dev": "tsx watch src/index.ts",
		"build": "npm run build:server && npm run build:admin",
		"build:server": "tsc",
		"build:admin": "vite build",
		"start": "NODE_ENV=production node dist/index.js"
	}
}
```

Exclude TSX from the server TypeScript build (`tsconfig.json`):

```json
{
	"exclude": ["node_modules", "dist", "**/*.tsx"]
}
```

#### 5. Start the App

Development (server + Vite HMR for the admin UI):

```bash
npm run dev
```

Production:

```bash
npm run build
npm run start
```

</details>
