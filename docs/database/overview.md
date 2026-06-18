---
title: Database & MikroORM
---

# Database & MikroORM

KratosJs uses [MikroORM](https://mikro-orm.io/) as its mandatory ORM. The same `MikroOrmAdapter` powers both **SQL** (MySQL, SQLite, PostgreSQL) and **NoSQL** (MongoDB) through MikroORM drivers.

## Installation

If you created your app with the [CLI](/getting-started), MikroORM is already installed and configured — no extra steps needed.

```bash
npx @maxal_studio/kratosjs-cli new my-app --driver sqlite
```

The CLI adds `@maxal_studio/kratosjs`, `@mikro-orm/core`, and the driver package for your chosen database (for example `@mikro-orm/mysql` + `@mikro-orm/migrations` for MySQL, or `@mikro-orm/mongodb` for MongoDB). Your generated `src/index.ts` already wires up `panel.orm()` for that driver.

<details>
<summary><strong>Manual installation</strong> — only if you are adding KratosJs to an existing project without the CLI</summary>

Install the core package and the driver(s) your app needs:

```bash
npm install @maxal_studio/kratosjs @mikro-orm/core
```

**MongoDB:**

```bash
npm install @mikro-orm/mongodb
```

**MySQL:**

```bash
npm install @mikro-orm/mysql @mikro-orm/migrations
```

</details>

## Defining Entities

Entities are defined with MikroORM `EntitySchema` (no decorators required). This works identically for SQL and MongoDB:

```typescript
// src/entities/User.ts
import { EntitySchema } from '@mikro-orm/core';

export interface IUser {
	id: string;
	name: string;
	email: string;
	active: boolean;
	createdAt: Date;
}

export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		_id: { type: 'ObjectId', primary: true },
		id: { type: 'string', serializedPrimaryKey: true },
		name: { type: 'string' },
		email: { type: 'string' },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
```

For SQL databases, use a numeric auto-increment primary key instead:

```typescript
export const User = new EntitySchema<IUser>({
	name: 'User',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		name: { type: 'string' },
		email: { type: 'string' },
		active: { type: 'boolean', default: true },
		createdAt: { type: 'Date', onCreate: () => new Date() },
	} as any,
});
```

### Defining relations

Relations are declared with the `kind` (`m:1`, `1:m`, `m:n`, `1:1`) and `entity` options. As of MikroORM 7, the relation target must be a class or `EntitySchema` reference — pass it as a function (`() => Target`); plain string entity names are no longer supported.

```typescript
// src/entities/Post.ts
import { EntitySchema } from '@mikro-orm/core';
import { User } from './User';

export const Post = new EntitySchema<IPost>({
	name: 'Post',
	properties: {
		id: { type: 'number', primary: true, autoincrement: true },
		title: { type: 'string' },
		// many Posts → one User; reference the entity, not the string 'User'
		author: { kind: 'm:1', entity: () => User, nullable: true },
	} as any,
});
```

## Configuring the Panel

Use `panel.orm()` to configure MikroORM. The panel collects entities from all registered resources (and plugins) during `start()`:

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';

const panel = Panel.make('admin')
	.path('/kratosjs/api')
	.orm(
		{
			driver: MongoDriver,
			clientUrl: 'mongodb://localhost:27017',
			dbName: 'kratosjs',
		},
		{ updateSchema: true }, // create collections/indexes on startup (dev)
	)
	.resources([UserResource, PostResource]);

await panel.start(3001);
```

**MySQL example:**

```typescript
import { MySqlDriver } from '@mikro-orm/mysql';
import { Migrator } from '@mikro-orm/migrations';

const panel = Panel.make('admin').orm(
	{
		driver: MySqlDriver,
		host: 'localhost',
		port: 3306,
		user: 'root',
		password: '',
		dbName: 'kratosjs',
		extensions: [Migrator],
	},
	{ migrate: true, updateSchema: true },
);
```

## Linking Resources to Entities

Resources reference entities via the static `entity` property (not `model`):

```typescript
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User; // MikroORM EntitySchema
}
```

## Accessing the ORM

After `panel.start()`:

```typescript
const orm = panel.getOrm(); // MikroORM instance
const em = panel.getEm(); // request-scoped EntityManager inside HTTP handlers
const fork = panel.getOrm().em.fork(); // standalone fork for seeding/scripts
```

## Example Apps

The monorepo includes two reference implementations:

| App           | Path               | Database | Notes                                                 |
| ------------- | ------------------ | -------- | ----------------------------------------------------- |
| Mongo example | `examples/app`     | MongoDB  | Users, Posts, Comments, auth, featured images         |
| SQL example   | `examples/sql-app` | MySQL    | CMS plugin with entities, migrations, and seeded data |

Run from the repo root:

```bash
npm install
cd examples/app && npx tsx src/index.ts   # http://localhost:3001
cd examples/sql-app && npx tsx src/index.ts  # http://localhost:3002
```

Default login for both: `admin@example.com` / `password`

## Next Steps

- [Plugin Entities & Migrations](/plugins/migrations) — ship database tables from plugins
- [Creating Resources](/resources/creating-resources) — wire entities into resources
- [Authentication](/authentication/overview) — auth with MikroORM queries
