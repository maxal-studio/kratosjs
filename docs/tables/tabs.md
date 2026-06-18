---
title: Tabs
---

# Tabs

Tabs provide quick filters at the top of a table, allowing users to switch between predefined filtered views.

'All' tab will be added by default

## Basic Usage

```typescript
import { TableBuilder, equalsRule } from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([...])
	.tabs([
		{
			default: true
			key: 'active',
			label: 'Active',
			icon: 'Check',
			queryBuilder: [equalsRule('active', true, 'boolean')],
		},
		{
			key: 'inactive',
			label: 'Inactive',
			icon: 'X',
			queryBuilder: [equalsRule('active', false, 'boolean')],
		},
	]);
```

## Tab Properties

Each tab requires:

- **`key`**: Unique identifier for the tab
- **`label`**: Display label
- **`icon`**: Optional Lucide icon name
- **`queryBuilder`**: Array of query builder rules that define the filter
- **`default`**: Select the default tab

## Query Builder Rules

Tabs use query builder rules to define filters. KratosJs provides helper functions:

### equalsRule

Filter where field equals a value:

```typescript
equalsRule('role', 'admin', 'text');
equalsRule('active', true, 'boolean');
equalsRule('coins', 100, 'number');
```

### notEqualsRule

Filter where field does not equal a value:

```typescript
notEqualsRule('role', 'admin', 'text');
```

### containsRule

Filter where field contains a value:

```typescript
containsRule('name', 'John');
```

### startsWithRule

Filter where field starts with a value:

```typescript
startsWithRule('email', 'admin@');
```

### endsWithRule

Filter where field ends with a value:

```typescript
endsWithRule('domain', '.com');
```

### greaterThanRule

Filter where field is greater than a value:

```typescript
greaterThanRule('coins', 100, 'number');
```

### greaterThanOrEqualRule

Filter where field is greater than or equal to a value:

```typescript
greaterThanOrEqualRule('coins', 100, 'number');
```

### lessThanRule

Filter where field is less than a value:

```typescript
lessThanRule('coins', 100, 'number');
```

### lessThanOrEqualRule

Filter where field is less than or equal to a value:

```typescript
lessThanOrEqualRule('coins', 100, 'number');
```

### betweenRule

Filter where field is between two values:

```typescript
betweenRule('coins', [100, 500], 'number');
betweenRule('createdAt', [new Date('2024-01-01'), new Date('2024-12-31')], 'date');
```

### notBetweenRule

Filter where field is not between two values:

```typescript
notBetweenRule('coins', [100, 500], 'number');
```

### isNullRule

Filter where field is null:

```typescript
isNullRule('deletedAt');
```

### isNotNullRule

Filter where field is not null:

```typescript
isNotNullRule('deletedAt');
```

### beforeRule

Filter where field is before a value (dates or numbers):

```typescript
beforeRule('createdAt', new Date('2024-01-01'), 'date');
```

### afterRule

Filter where field is after a value (dates or numbers):

```typescript
afterRule('createdAt', new Date('2024-01-01'), 'date');
```

### inRule

Filter where field is any of the values:

```typescript
inRule('role', ['admin', 'user'], 'select');
```

### notInRule

Filter where field is none of the values:

```typescript
notInRule('role', ['guest', 'banned'], 'select');
```

### orRule

Create an OR group (at least one rule must match):

```typescript
orRule([[equalsRule('role', 'admin', 'text')], [equalsRule('role', 'manager', 'text')]]);
```

## Multiple Rules

Combine multiple rules (AND logic):

```typescript
{
	key: 'vip',
	label: 'VIP Users',
	icon: 'ShieldUser',
	queryBuilder: [
		equalsRule('role', 'admin', 'text'),
		greaterThanRule('coins', 1000, 'number'),
	],
}
```

## Complete Example

```typescript
import {
	TableBuilder,
	equalsRule,
	notEqualsRule,
	greaterThanRule,
} from '@maxal_studio/kratosjs';

TableBuilder.make()
	.columns([...])
	.tabs([
		{
			default: true,
			key: 'vip',
			label: 'VIP',
			icon: 'ShieldUser',
			queryBuilder: [equalsRule('role', 'admin', 'text')],
		},
		{
			key: 'guest',
			label: 'Guest',
			icon: 'UserMinus',
			queryBuilder: [equalsRule('role', 'guest', 'text')],
		},
		{
			key: 'client',
			label: 'Client',
			icon: 'FileUser',
			queryBuilder: [equalsRule('role', 'client', 'text')],
		},
		{
			key: 'user',
			label: 'User',
			icon: 'User',
			queryBuilder: [equalsRule('role', 'user', 'text')],
		},
		{
			key: 'rich',
			label: 'Rich Users',
			icon: 'Coins',
			queryBuilder: [greaterThanRule('coins', 1000, 'number')],
		},
	]);
```
