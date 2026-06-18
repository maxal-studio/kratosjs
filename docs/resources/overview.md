---
title: Overview
---

# Resources Overview

Resources are the core building blocks of KratosJs. They define how your MikroORM entities are exposed in the admin panel, including forms, tables, actions, and permissions.

## What is a Resource?

A resource represents a single entity type in your admin panel. Each resource:

- Maps to a MikroORM entity (via `EntitySchema`)
- Defines form fields for create/edit operations
- Defines table columns for list views
- Handles permissions and access control
- Supports custom actions, widgets, and hooks

## Basic Resource Structure

```typescript
import { BaseResource, FormBuilder, TableBuilder, TextInput, TextColumn } from '@maxal_studio/kratosjs';
import { User } from '../entities/User';

export class UserResource extends BaseResource {
	static slug = 'users';
	static entity = User;
	static label = 'User';
	static pluralLabel = 'Users';
	static icon = 'Users';
	static navigationGroup = 'User Management';
	static navigationSort = 1;

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
		]);
	}
}
```

## Resource Properties

| Property            | Type           | Description                               |
| ------------------- | -------------- | ----------------------------------------- |
| `slug`              | `string`       | URL-friendly identifier (e.g., `'users'`) |
| `entity`            | `EntitySchema` | MikroORM entity schema for this resource  |
| `label`             | `string`       | Singular label (e.g., `'User'`)           |
| `pluralLabel`       | `string`       | Plural label (e.g., `'Users'`)            |
| `icon`              | `string`       | Lucide icon name (e.g., `'Users'`)        |
| `navigationGroup`   | `string`       | Sidebar group name                        |
| `navigationSort`    | `number`       | Sort order within the group               |
| `searchableColumns` | `string[]`     | Columns included in global search         |
| `defaultSort`       | `object`       | Default sort field and direction          |

## Resource Methods

| Method                 | Returns                   | Description                       |
| ---------------------- | ------------------------- | --------------------------------- |
| `form()`               | `FormBuilder`             | Form schema for create/edit       |
| `table()`              | `TableBuilder`            | Table schema for list view        |
| `actions()`            | `Action[]`                | Custom row/bulk actions           |
| `widgets()`            | `Widget[]`                | Dashboard widgets                 |
| `relations()`          | `Relation[]`              | Related resources shown on detail |
| `getNavigationBadge()` | `NavigationBadge \| null` | Optional sidebar badge count      |

## Registering Resources

Register resources with the panel:

```typescript
import { Panel } from '@maxal_studio/kratosjs';
import { MongoDriver } from '@mikro-orm/mongodb';
import { UserResource } from './resources/UserResource';

const panel = Panel.make('admin')
	.path('/kratosjs/api')
	.orm({ driver: MongoDriver, clientUrl: 'mongodb://localhost:27017', dbName: 'kratosjs' }, { updateSchema: true })
	.resources([UserResource]);

await panel.start(3001);
```

## Next Steps

- [Creating Resources](./creating-resources.md) - Detailed guide to building resources
- [Database & MikroORM](../database/overview.md) - Entity setup and panel configuration
- [Forms](../forms/overview.md) - Form field types and validation
- [Tables](../tables/overview.md) - Table columns and filters
