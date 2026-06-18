---
title: Badge Column
---

# Badge Column (`BadgeColumn`)

The `BadgeColumn` is a convenience wrapper around `TextColumn` that automatically applies the `badge()` method. It displays text as a badge/pill-style element.

```typescript
import { BadgeColumn } from '@maxal_studio/kratosjs';

BadgeColumn.make('status').label('Status').color({
	active: 'green',
	inactive: 'gray',
	pending: 'yellow',
});
```

## Available Options

Since `BadgeColumn` extends `TextColumn`, it supports all `TextColumn` options:

- `make(name: string)`: Creates a new `BadgeColumn` instance (automatically applies `badge(true)`).
- `label(text: Resolvable<string>)`: Sets the column header label.
- `color(color: string | Record<string, string> | ((state: any, record: any) => string))`: Sets the badge color.
- `sortable(condition?: Resolvable<boolean>)`: Enables sorting.
- `searchable(condition?: Resolvable<boolean>)`: Enables searching.
- `copyable(condition?: Resolvable<boolean>)`: Allows copying text to clipboard.
- `limit(length: number)`: Truncates text to a specified length.
- `tooltip(text: Resolvable<string>)`: Adds a tooltip.
- `url(url: string | ((record: any) => string))`: Makes the badge a clickable link.
- `openUrlInNewTab(condition?: Resolvable<boolean>)`: Opens the link in a new tab.
- `formatStateUsing(callback: (state: any, record: any) => any)`: Custom function to format the displayed state.
- `placeholder(text: Resolvable<string>)`: Placeholder text for empty values.
- `hidden(condition?: Resolvable<boolean>)`: Hides the column.
- `disabled(condition?: Resolvable<boolean>)`: Disables the column.
- `width(width: string | number)`: Sets the column width.
- `alignment(alignment: 'left' | 'center' | 'right')`: Sets alignment.
- `toggleable(condition?: Resolvable<boolean>)`: Allows column visibility to be toggled.
- `description(text: Resolvable<string>)`: Adds a description below the column label.

## Color Mapping

You can map different values to different colors:

```typescript
BadgeColumn.make('role').label('Role').color({
	admin: 'red',
	user: 'blue',
	guest: 'gray',
});
```

## Dynamic Color

Use a function to determine the color dynamically:

```typescript
BadgeColumn.make('status')
	.label('Status')
	.color((state, record) => {
		if (record.isActive) return 'green';
		if (record.isPending) return 'yellow';
		return 'gray';
	});
```

## Complete Example

```typescript
BadgeColumn.make('role')
	.label('User Role')
	.color({
		admin: 'red',
		moderator: 'orange',
		user: 'blue',
		guest: 'gray',
	})
	.sortable()
	.searchable();
```
