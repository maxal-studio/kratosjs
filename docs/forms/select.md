---
title: Select
---

# Select

The select field allows you to choose from a list of options.

## Basic Usage

```typescript
import { SelectInput } from '@maxal_studio/kratosjs';

SelectInput.make('role').options({
	admin: 'Admin',
	user: 'User',
	guest: 'Guest',
});
```

## Multiple Selection

Allow users to select multiple options:

```typescript
SelectInput.make('tags')
	.options({
		frontend: 'Frontend',
		backend: 'Backend',
		design: 'Design',
	})
	.multiple();
```

## Searchable

Make the select searchable:

```typescript
SelectInput.make('country')
	.options({
		us: 'United States',
		uk: 'United Kingdom',
		ca: 'Canada',
	})
	.searchable();
```

## Creatable

Allow users to create new options:

```typescript
SelectInput.make('tags')
	.options({
		javascript: 'JavaScript',
		typescript: 'TypeScript',
	})
	.creatable()
	.multiple();
```

## Placeholder

```typescript
SelectInput.make('role')
	.options({
		admin: 'Admin',
		user: 'User',
	})
	.placeholder('Select a role...');
```

## Default Value

```typescript
SelectInput.make('role')
	.options({
		admin: 'Admin',
		user: 'User',
	})
	.default('user');
```

## Required

```typescript
SelectInput.make('role')
	.options({
		admin: 'Admin',
		user: 'User',
	})
	.required();
```

## Relationships

Load options from a related resource via `POST /:resource/list`. The first argument is the **entity relation property**; the third is the **related resource** (class or slug) whose `static slug` drives the API route:

```typescript
import { UserResource } from '../resources/UserResource';

// Pass the related resource class (recommended)
SelectInput.make('author').label('Author').relationship('author', 'name', UserResource);

// Or pass the slug string directly
SelectInput.make('post').label('Post').relationship('post', 'title', 'posts');
```

| Argument         | Description                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- |
| `name`           | MikroORM relation property on the entity (e.g. `author`, `post`)                        |
| `titleAttribute` | Field shown as the option label (e.g. `name`, `title`)                                  |
| `resource`       | Required. Related `BaseResource` class or slug string (e.g. `UserResource` → `'users'`) |

The relation property name (`author`) and the resource slug (`users`) are often different — always pass the related resource so the select calls the correct list endpoint.

## Complete Example

```typescript
SelectInput.make('role')
	.label('User Role')
	.options({
		admin: 'Administrator',
		user: 'User',
		guest: 'Guest',
	})
	.required()
	.default('user')
	.placeholder('Select a role...')
	.hint('Choose the user role')
	.hintIcon('User');
```
