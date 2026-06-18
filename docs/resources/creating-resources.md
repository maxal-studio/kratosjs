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

## 2. Create the Resource Class

```typescript
// src/resources/UserResource.ts
import { BaseResource, FormBuilder, TableBuilder, TextInput, TextColumn, BooleanColumn } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'User Management';
	static navigationSort = 1;
	static searchableColumns = ['name', 'email'];

	static form() {
		return FormBuilder.make().schema([
			TextInput.make('name').label('Name').required(),
			TextInput.make('email').label('Email').required(),
		]);
	}

	static table() {
		return TableBuilder.make().columns([
			TextColumn.make('name').label('Name'),
			TextColumn.make('email').label('Email'),
			BooleanColumn.make('active').label('Active'),
		]);
	}
}
```

## 3. Configure the Panel

```typescript
// src/index.ts
import { Panel } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';

const panel = Panel.make('admin')
	.path('/kratosjs/api')
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

```typescript
import { Action } from '@maxal_studio/kratosjs';

static actions() {
	return [
		Action.make('activate')
			.label('Activate')
			.icon('Check')
			.action(async (records, context) => {
				const em = context.em;
				for (const record of records) {
					record.active = true;
				}
				await em.flush();
				return { message: 'Users activated' };
			}),
	];
}
```

## Adding Relations

Show related records on the detail view:

```typescript
import { Relation } from '@maxal_studio/kratosjs';
import { CommentResource } from './CommentResource';

static relations() {
	return [
		Relation.make(CommentResource)
			.label('Comments')
			.foreignKey('postId'),
	];
}
```

## Adding Hooks

See [Hooks](./hooks.md) for lifecycle hooks like `beforeCreate`, `afterUpdate`, etc.

## Next Steps

- [Forms](../forms/overview.md) - All available form field types
- [Tables](../tables/overview.md) - Columns, filters, and sorting
- [Widgets](./widgets.md) - Stats and chart widgets
- [Database & MikroORM](../database/overview.md) - SQL vs MongoDB setup
