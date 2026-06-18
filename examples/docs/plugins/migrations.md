---
title: Plugin Entities & Migrations
---

# Plugin Entities & Migrations

Plugins can register their own MikroORM entities and migrations with the panel. This lets a plugin ship its own database tables, seed data, and admin resources as a self-contained module.

See also [Driver-Agnostic Entities](./creating-plugins.md#driver-agnostic-entities) in Creating Plugins for the `idProps(driver)` pattern.

## Registering Entities

In your plugin's `register()` method, call `panel.registerEntities()` during the plugin registration phase (before `panel.start()` runs):

```typescript
import { Plugin, Panel } from '@maxal_studio/kratosjs';
import { createCmsEntities } from './entities';
import { PostResource } from './resources/PostResource';

export class CmsPlugin extends Plugin {
	getName(): string {
		return 'cms';
	}

	register(panel: Panel): void {
		const driver = panel.getDriverKind(); // 'sql' | 'mongo'
		const { Category, Post, Comment } = createCmsEntities(driver);

		panel.registerEntities([Category, Post, Comment]);

		PostResource.entity = Post;
		panel.registerResource(PostResource);
	}
}
```

Entities registered here are merged into the MikroORM configuration alongside app-level resource entities.

## Registering Migrations

Register migration classes with `panel.registerMigrations()`. They run automatically during `panel.start()` via `migrator.up()`.

Register SQL migrations only when the active driver is SQL — MongoDB apps rely on `updateSchema: true` instead:

```typescript
import { Migration20250101000000CreateCmsTables } from './migrations/sql/Migration20250101000000CreateCmsTables';
import { Migration20250102000000AddFeaturedImageAndComments } from './migrations/sql/Migration20250102000000AddFeaturedImageAndComments';

register(panel: Panel): void {
	const driver = panel.getDriverKind();
	const { Category, Post, Comment } = createCmsEntities(driver);

	panel.registerEntities([Category, Post, Comment]);

	if (driver === 'sql') {
		panel.registerMigrations([
			Migration20250101000000CreateCmsTables,
			Migration20250102000000AddFeaturedImageAndComments,
		]);
	}
}
```

Store SQL migrations under `src/migrations/sql/` inside the plugin package.

### Writing a Migration

Migrations extend MikroORM's `Migration` class and use raw SQL:

```typescript
// src/migrations/sql/Migration20250101000000CreateCmsTables.ts
import { Migration } from '@mikro-orm/migrations';

export class Migration20250101000000CreateCmsTables extends Migration {
	async up(): Promise<void> {
		this.addSql(`
			create table if not exists \`category\` (
				\`id\` int unsigned not null auto_increment primary key,
				\`name\` varchar(255) not null,
				\`slug\` varchar(255) not null,
				\`created_at\` datetime not null
			) default character set utf8mb4 engine = InnoDB;
		`);

		this.addSql(`
			insert into \`category\` (\`name\`, \`slug\`, \`created_at\`) values
				('News', 'news', now()),
				('Tutorials', 'tutorials', now());
		`);
	}

	async down(): Promise<void> {
		this.addSql('drop table if exists `category`;');
	}
}
```

## Boot Hook (Idempotent Seeding)

Plugins can implement an optional `boot(em, panel)` hook that runs after migrations. Use it for idempotent seeding — especially on MongoDB where SQL migrations are not registered:

```typescript
import type { EntityManager } from '@mikro-orm/core';

async boot(em: EntityManager): Promise<void> {
	const count = await em.count('Category', {});
	if (count > 0) return;

	em.create('Category', { name: 'News', slug: 'news' });
	await em.flush();
}
```

The panel calls `boot()` with a forked `EntityManager`, so it is safe to use outside HTTP request context.

## Complete Example

See [Creating Plugins](./creating-plugins.md) for a full walkthrough of building a plugin with entities, migrations, resources, and optional client components.

## MongoDB Note

For MongoDB apps, use `updateSchema: true` in `panel.orm()` options instead of SQL migrations. Collections and indexes are created automatically on startup:

```typescript
panel.orm({ driver: MongoDriver, clientUrl: '...', dbName: 'kratosjs' }, { updateSchema: true });
```

Use the `boot()` hook for idempotent sample data on MongoDB. Standalone MongoDB instances do not support transactions, so MikroORM's MongoDB migrator runs with `transactional: false` automatically.

## App-Level Migrations

Apps scaffolded with the CLI include a `src/migrations/` folder and use `updateSchema: true` on first boot. When you are ready for versioned migrations in your app (not a plugin), generate them with:

```bash
npx mikro-orm migration:create
```

Then register them on the panel with `.registerMigrations([...])` the same way plugins do.
