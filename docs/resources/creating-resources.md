---
title: Creating Resources
---

# Creating Resources

This guide walks through creating a complete resource from entity to admin panel.

## 1. Define the Entity

Create a MikroORM entity with `EntitySchema`:

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

> The primary-key shape above is for MongoDB. For SQL drivers (mysql, postgresql, mariadb, sqlite) use an auto-increment id instead:
>
> ```typescript
> id: { type: 'number', primary: true, autoincrement: true },
> ```

## 2. Create the Resource Class

```typescript
// src/resources/UserResource.ts
import { BaseResource, FormBuilder, TableBuilder, TextInput, TextColumn, ToggleColumn } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'User Management';
	static navigationSort = 1;
	static globallySearchableAttributes = ['name', 'email'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label('Name').required(),
			TextInput.make('email').label('Email').required(),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('name').label('Name').searchable(),
			TextColumn.make('email').label('Email').searchable(),
			ToggleColumn.make('active').label('Active'),
		]);
	}
}
```

> Use `globallySearchableAttributes` to include fields in the global search. Enable per-column search with `.searchable()` on the column. (There is no `searchableColumns` member and no `BooleanColumn` — use `ToggleColumn` or `CheckboxColumn` for booleans.)

## 3. Configure the Panel

```typescript
// src/index.ts
import { Panel } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';

const panel = Panel.make('admin')
	.orm({ driver: MongoDriver, clientUrl: 'mongodb://localhost:27017', dbName: 'kratosjs' }, { updateSchema: true })
	.resources([UserResource]);

await panel.start(3001);
```

## Adding Widgets

Widgets display aggregated data on dashboards:

```typescript
import { StatsWidget } from '@maxal_studio/kratosjs';

static widgets() {
	return [
		StatsWidget.make('totalUsers')
			.label('Total Users')
			.render(async (em, entity) => em.count(entity, {})),
		StatsWidget.make('activeUsers')
			.label('Active Users')
			.render(async (em, entity) => em.count(entity, { active: true })),
	];
}
```

The render function receives `(em, entity)` where `em` is the MikroORM `EntityManager` and `entity` is the resource's entity schema.

## Adding Actions

Custom actions have two halves that link by name: **builders** placed in `table().actions()` / `.bulkActions()` / `.headerActions()`, and **handlers** returned from `static actions(): Record<string, ActionHandler>`.

```typescript
import { TableBuilder, Action, type ActionHandler } from '@maxal_studio/kratosjs';

static table() {
	return TableBuilder.make()
		.columns([...])
		.actions([Action.make('activate').label('Activate').icon('Check')]);
}

static actions(): Record<string, ActionHandler> {
	return {
		activate: async ({ records = [] }) => {
			const em = this.getPanel().getEm().fork();
			await em.nativeUpdate(this.entity, { id: { $in: records.map(r => r.id) } }, { active: true });
			return { success: true, message: `${records.length} user(s) activated` };
		},
	};
}
```

Handlers receive `{ records, formData }` and return `{ success, message?, data?, redirect?, refreshBadges? }`. View / edit / delete are built in — don't add them here. See [Actions](./actions.md) for forms, confirmation dialogs, and bulk/header actions.

## Adding Relations

Show related records on the detail view. Relations are plain `RelationConfig` objects:

```typescript
import { CommentResource } from './CommentResource';
import type { RelationConfig } from '@maxal_studio/kratosjs';

static relations(): RelationConfig[] {
	return [
		{
			name: 'comments',
			resource: CommentResource,
			label: 'Comment',
			pluralLabel: 'Comments',
			icon: 'MessageSquare',
			localKey: 'id',        // field on this resource ('_id' for MongoDB)
			foreignKey: 'postId',  // field on CommentResource referencing this record
		},
	];
}
```

See [Relations](./relations.md) for one-to-many, many-to-many (via a join resource), and self-referencing relations.

## Adding Hooks

See [Hooks](./hooks.md) for lifecycle hooks like `beforeCreate`, `afterUpdate`, etc.

## Next Steps

- [Forms](../forms/overview.md) - All available form field types
- [Tables](../tables/overview.md) - Columns, filters, and sorting
- [Widgets](./widgets.md) - Stats and chart widgets
- [Database & MikroORM](../database/overview.md) - SQL vs MongoDB setup
